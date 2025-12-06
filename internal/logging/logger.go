package logging

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	logger *slog.Logger
	once   sync.Once
)

type dailyRotatingWriter struct {
	mu          sync.Mutex
	dir         string
	prefix      string
	currentDate string
	file        *os.File
}

func newDailyRotatingWriter(dir, prefix string) (*dailyRotatingWriter, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	w := &dailyRotatingWriter{
		dir:    dir,
		prefix: prefix,
	}

	if err := w.rotate(); err != nil {
		return nil, err
	}

	return w, nil
}

func (w *dailyRotatingWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	currentDate := time.Now().Format("2006-01-02")
	if currentDate != w.currentDate {
		if err := w.rotate(); err != nil {
			return 0, err
		}
	}

	return w.file.Write(p)
}

func (w *dailyRotatingWriter) rotate() error {
	if w.file != nil {
		w.file.Close()
	}

	w.currentDate = time.Now().Format("2006-01-02")
	filename := filepath.Join(w.dir, fmt.Sprintf("%s-%s.log", w.prefix, w.currentDate))

	file, err := os.OpenFile(filename, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	w.file = file
	return nil
}

func (w *dailyRotatingWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.file != nil {
		return w.file.Close()
	}
	return nil
}

func parseLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func Init(level, output, logDir string) error {
	var initErr error

	once.Do(func() {
		var writers []io.Writer
		logLevel := parseLevel(level)

		if output == "stdout" || output == "both" {
			writers = append(writers, os.Stdout)
		}

		if output == "file" || output == "both" {
			fileWriter, err := newDailyRotatingWriter(logDir, "expenseowl")
			if err != nil {
				initErr = err
				return
			}
			writers = append(writers, fileWriter)
		}

		if len(writers) == 0 {
			writers = append(writers, os.Stdout)
		}

		var writer io.Writer
		if len(writers) == 1 {
			writer = writers[0]
		} else {
			writer = io.MultiWriter(writers...)
		}

		opts := &slog.HandlerOptions{
			Level: logLevel,
		}

		handler := slog.NewJSONHandler(writer, opts)
		logger = slog.New(handler)
		slog.SetDefault(logger)
	})

	return initErr
}

func Logger() *slog.Logger {
	if logger == nil {
		return slog.Default()
	}
	return logger
}

func Debug(msg string, args ...any) {
	Logger().Debug(msg, args...)
}

func Info(msg string, args ...any) {
	Logger().Info(msg, args...)
}

func Warn(msg string, args ...any) {
	Logger().Warn(msg, args...)
}

func Error(msg string, args ...any) {
	Logger().Error(msg, args...)
}