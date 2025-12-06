FROM golang:alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -ldflags="-s -w" -o expenseowl ./cmd/expenseowl

FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

RUN mkdir -p /app/data /app/logs

COPY --from=builder /app/expenseowl .

EXPOSE 8080

CMD ["./expenseowl", "--auth"]
