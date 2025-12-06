package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/tanq16/expenseowl/internal/api"
	"github.com/tanq16/expenseowl/internal/auth"
	"github.com/tanq16/expenseowl/internal/config"
	"github.com/tanq16/expenseowl/internal/storage"
)

var version = "dev"

func init() {
	// Load .env file if it exists (ignore error if it doesn't exist)
	_ = godotenv.Load()
}

func runServer(port int) {
	storage, err := storage.InitializeStorage()
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	defer storage.Close()
	handler := api.NewHandler(storage)

	// Version Handler
	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(version))
	})

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Config
	http.HandleFunc("/config", handler.GetConfig)
	http.HandleFunc("/categories", handler.GetCategories)
	http.HandleFunc("/categories/edit", handler.UpdateCategories)
	http.HandleFunc("/currency", handler.GetCurrency)
	http.HandleFunc("/currency/edit", handler.UpdateCurrency)
	http.HandleFunc("/startdate", handler.GetStartDate)
	http.HandleFunc("/startdate/edit", handler.UpdateStartDate)
	// http.HandleFunc("/tags", handler.GetTags)
	// http.HandleFunc("/tags/edit", handler.UpdateTags)

	// Expenses
	http.HandleFunc("/expense", handler.AddExpense)                     // PUT for add
	http.HandleFunc("/expenses", handler.GetExpenses)                   // GET all
	http.HandleFunc("/expense/edit", handler.EditExpense)               // PUT for edit
	http.HandleFunc("/expense/delete", handler.DeleteExpense)           // DELETE for single
	http.HandleFunc("/expenses/delete", handler.DeleteMultipleExpenses) // DELETE for multiple

	// Recurring Expenses
	http.HandleFunc("/recurring-expense", handler.AddRecurringExpense)           // PUT for add
	http.HandleFunc("/recurring-expenses", handler.GetRecurringExpenses)         // GET all
	http.HandleFunc("/recurring-expense/edit", handler.UpdateRecurringExpense)   // PUT for edit
	http.HandleFunc("/recurring-expense/delete", handler.DeleteRecurringExpense) // DELETE

	// Import/Export
	http.HandleFunc("/export/csv", handler.ExportCSV)
	http.HandleFunc("/import/csv", handler.ImportCSV)
	http.HandleFunc("/import/csvold", handler.ImportOldCSV)

	// Voice & AI
	http.HandleFunc("/voice/parse", handler.ParseVoiceExpense)       // POST voice to get parsed expenses
	http.HandleFunc("/receipt/parse", handler.ParseReceiptExpense)   // POST receipt image to get parsed expense
	http.HandleFunc("/settings/ai", handler.GetAIConfig)             // GET AI config
	http.HandleFunc("/settings/ai/update", handler.UpdateAIConfig)   // PUT AI config
	http.HandleFunc("/settings/ai/test", handler.TestAIConnection)   // POST test AI connection

	log.Println("Starting server on port", port, "...")
	if err := http.ListenAndServe(fmt.Sprint(":", port), nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func runAuthServer(port int) {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to PostgreSQL
	db, err := sql.Open("postgres", cfg.ConnectionString())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("✅ Connected to PostgreSQL database")

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(cfg.JWTSecret, cfg.JWTAccessTokenExpiry, cfg.JWTRefreshTokenExpiry)

	// Create handlers
	pgHandler := api.NewPostgresHandler(db)
	authHandler := api.NewAuthHandler(db, jwtManager)
	oauthHandler := api.NewOAuthHandler(db, jwtManager, cfg.GoogleClientID, cfg.AppleClientID, cfg.AppleTeamID, cfg.AppleKeyID, cfg.ApplePrivateKeyPath)
	syncHandler := api.NewSyncHandler(db)

	// Create middleware
	authMiddleware := api.AuthMiddleware(jwtManager)

	// Version Handler
	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte("v2.0.0-multiuser"))
	})

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Authentication routes (public)
	http.HandleFunc("/api/auth/register", authHandler.Register)
	http.HandleFunc("/api/auth/login", authHandler.Login)
	http.HandleFunc("/api/auth/refresh", authHandler.RefreshToken)
	http.HandleFunc("/api/auth/logout", authHandler.Logout)

	// OAuth routes (public)
	http.HandleFunc("/api/auth/google/verify", oauthHandler.GoogleVerify)
	http.HandleFunc("/api/auth/apple/verify", oauthHandler.AppleVerify)

	// Protected API routes (require authentication)
	// Config
	http.Handle("/api/config", authMiddleware(http.HandlerFunc(pgHandler.GetConfig)))
	http.Handle("/api/categories", authMiddleware(http.HandlerFunc(pgHandler.GetCategories)))
	http.Handle("/api/categories/edit", authMiddleware(http.HandlerFunc(pgHandler.UpdateCategories)))
	http.Handle("/api/currency", authMiddleware(http.HandlerFunc(pgHandler.GetCurrency)))
	http.Handle("/api/currency/edit", authMiddleware(http.HandlerFunc(pgHandler.UpdateCurrency)))
	http.Handle("/api/startdate", authMiddleware(http.HandlerFunc(pgHandler.GetStartDate)))
	http.Handle("/api/startdate/edit", authMiddleware(http.HandlerFunc(pgHandler.UpdateStartDate)))

	// Expenses
	http.Handle("/api/expense", authMiddleware(http.HandlerFunc(pgHandler.AddExpense)))
	http.Handle("/api/expenses", authMiddleware(http.HandlerFunc(pgHandler.GetExpenses)))
	http.Handle("/api/expense/edit", authMiddleware(http.HandlerFunc(pgHandler.EditExpense)))
	http.Handle("/api/expense/delete", authMiddleware(http.HandlerFunc(pgHandler.DeleteExpense)))
	http.Handle("/api/expenses/delete", authMiddleware(http.HandlerFunc(pgHandler.DeleteMultipleExpenses)))

	// Recurring Expenses
	http.Handle("/api/recurring-expense", authMiddleware(http.HandlerFunc(pgHandler.AddRecurringExpense)))
	http.Handle("/api/recurring-expenses", authMiddleware(http.HandlerFunc(pgHandler.GetRecurringExpenses)))
	http.Handle("/api/recurring-expense/edit", authMiddleware(http.HandlerFunc(pgHandler.UpdateRecurringExpense)))
	http.Handle("/api/recurring-expense/delete", authMiddleware(http.HandlerFunc(pgHandler.DeleteRecurringExpense)))

	// Sync (for offline-first mobile app)
	http.Handle("/api/sync/pull", authMiddleware(http.HandlerFunc(syncHandler.Pull)))
	http.Handle("/api/sync/push", authMiddleware(http.HandlerFunc(syncHandler.Push)))
	http.Handle("/api/sync/status", authMiddleware(http.HandlerFunc(syncHandler.GetSyncStatus)))

	// TODO: Import/Export not yet implemented for PostgreSQL
	// http.Handle("/api/export/csv", authMiddleware(http.HandlerFunc(pgHandler.ExportCSV)))
	// http.Handle("/api/import/csv", authMiddleware(http.HandlerFunc(pgHandler.ImportCSV)))
	// http.Handle("/api/import/csvold", authMiddleware(http.HandlerFunc(pgHandler.ImportOldCSV)))

	// Voice & AI (internal - not for mobile clients)
	http.Handle("/api/ai/voice/parse", authMiddleware(http.HandlerFunc(pgHandler.ParseVoiceExpense)))
	http.Handle("/api/ai/receipt/parse", authMiddleware(http.HandlerFunc(pgHandler.ParseReceiptExpense)))
	http.Handle("/api/ai/config", authMiddleware(http.HandlerFunc(pgHandler.GetAIConfig)))
	http.Handle("/api/ai/config/update", authMiddleware(http.HandlerFunc(pgHandler.UpdateAIConfig)))
	http.Handle("/api/ai/test", authMiddleware(http.HandlerFunc(pgHandler.TestAIConnection)))

	// User Preferences (user-facing settings only)
	http.Handle("/api/user/preferences", authMiddleware(http.HandlerFunc(pgHandler.GetUserPreferences)))
	http.Handle("/api/user/preferences/update", authMiddleware(http.HandlerFunc(pgHandler.UpdateUserPreferences)))

	// Legacy routes removed in multi-user mode
	// Use /api/* endpoints with authentication instead

	log.Println("🦉 ExpenseOwl Multi-User Server")
	log.Printf("📊 Database: %s:%s/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)
	log.Printf("🔐 JWT Expiry: Access=%v, Refresh=%v", cfg.JWTAccessTokenExpiry, cfg.JWTRefreshTokenExpiry)
	log.Printf("🚀 Server starting on port %d...", port)
	log.Println("🔓 Public endpoints: /api/auth/*, /health, /version")
	log.Println("🔒 Protected endpoints: /api/* (requires Bearer token)")
	log.Println("🌐 CORS enabled for all origins")

	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), api.CORSMiddleware(http.DefaultServeMux)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func main() {
	port := flag.Int("port", 8080, "Port to serve from")
	useAuth := flag.Bool("auth", false, "Enable multi-user authentication mode (requires PostgreSQL)")
	flag.Parse()

	if *useAuth {
		runAuthServer(*port)
	} else {
		runServer(*port)
	}
}
