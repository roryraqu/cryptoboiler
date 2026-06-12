package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

type Telemetry struct {
	BoilerID      string  `json:"boiler_id"`
	Temperature   float64 `json:"temperature"`
	Pressure      float64 `json:"pressure"`
	Timestamp     string  `json:"timestamp"`
	HMACSignature string  `json:"hmac_signature"`
}

type StatusCommand struct {
	Status string `json:"status"`
}

var (
	isActive bool = true
	mu       sync.Mutex
)

func computeHMAC(secret, payload string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

func formatFloat(f float64) string {
	return strconv.FormatFloat(f, 'f', 2, 64)
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodGet {
		mu.Lock()
		currentStatus := "stopped"
		if isActive {
			currentStatus = "active"
		}
		mu.Unlock()
		json.NewEncoder(w).Encode(map[string]string{"status": currentStatus})
		return
	}

	if r.Method == http.MethodPost {
		var cmd StatusCommand
		if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		mu.Lock()
		if cmd.Status == "active" {
			isActive = true
			log.Println("Получена команда: ЗАПУСК симуляции")
		} else if cmd.Status == "stopped" {
			isActive = false
			log.Println("Получена команда: ОСТАНОВКА симуляции")
		}
		mu.Unlock()

		json.NewEncoder(w).Encode(map[string]string{"result": "success", "status": cmd.Status})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func main() {
	addrFlag := flag.String("addr", "0.0.0.0:8080", "Listen address for control commands")
	idFlag := flag.String("id", "boiler-001", "Unique Boiler ID")
	secretFlag := flag.String("secret", "supersecretkey", "HMAC Secret Key")
	backendFlag := flag.String("backend", "http://localhost:4000/api/telemetry", "Backend URL")
	flag.Parse()

	backend := os.Getenv("BACKEND_URL")
	if backend == "" {
		backend = *backendFlag
	}
	boilerID := os.Getenv("BOILER_ID")
	if boilerID == "" {
		boilerID = *idFlag
	}
	secret := os.Getenv("HMAC_SECRET")
	if secret == "" {
		secret = *secretFlag
	}

	rand.Seed(time.Now().UnixNano())
	temp := 60.0
	pressure := 2.5
	client := &http.Client{Timeout: 5 * time.Second}

	log.Printf("Запуск узла [%s] на адресе [%s]", boilerID, *addrFlag)
	log.Printf("Целевой бэкенд телеметрии: %s", backend)

	http.HandleFunc("/status", statusHandler)
	go func() {
		log.Printf("Управляющий сервер запущен на http://%s", *addrFlag)
		if err := http.ListenAndServe(*addrFlag, nil); err != nil {
			log.Fatalf("Ошибка запуска HTTP сервера: %v", err)
		}
	}()

	for {
		mu.Lock()
		running := isActive
		mu.Unlock()

		if !running {
			time.Sleep(1 * time.Second)
			continue
		}

		jitter := rand.NormFloat64() * 0.5
		temp += jitter
		if temp < 20 {
			temp = 20
		} else if temp > 120 {
			temp = 120
		}

		pressure += rand.NormFloat64() * 0.05
		if pressure < 1.0 {
			pressure = 1.0
		} else if pressure > 6.0 {
			pressure = 6.0
		}

		ts := time.Now().UTC().Format(time.RFC3339)

		payloadStr := boilerID + "|" + formatFloat(temp) + "|" + formatFloat(pressure) + "|" + ts
		sig := computeHMAC(secret, payloadStr)

		t := Telemetry{
			BoilerID:      boilerID,
			Temperature:   temp,
			Pressure:      pressure,
			Timestamp:     ts,
			HMACSignature: sig,
		}

		b, _ := json.Marshal(t)
		req, _ := http.NewRequest("POST", backend, bytes.NewBuffer(b))
		req.Header.Set("Content-Type", "application/json")

		_, err := client.Do(req)
		if err != nil {
			log.Printf("Ошибка отправки телеметрии: %v", err)
		}

		time.Sleep(2 * time.Second)
	}
}