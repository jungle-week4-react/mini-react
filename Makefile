SHELL := /bin/zsh

PORT ?= 4173
PID_DIR := .make
WATCH_PID_FILE := $(PID_DIR)/tsc-watch.pid
SERVER_PID_FILE := $(PID_DIR)/http-server.pid
WATCH_LOG_FILE := $(PID_DIR)/tsc-watch.log
SERVER_LOG_FILE := $(PID_DIR)/http-server.log

.PHONY: build typecheck watch serve dev watch-start watch-stop serve-start serve-stop dev-start dev-stop status

build:
	npm run build

typecheck:
	npm run typecheck

# tsc watch를 원래 명령처럼 foreground로 실행한다. 종료는 Ctrl+C.
watch:
	npx tsc -w -p tsconfig.json

# 정적 서버를 foreground로 실행한다. 종료는 Ctrl+C.
serve:
	python3 -m http.server $(PORT)

# watch와 정적 서버를 같이 띄우고 Ctrl+C 한 번으로 같이 종료한다.
dev:
	@mkdir -p $(PID_DIR)
	@set -m; \
		cleanup() { \
			pids="$$(jobs -p)"; \
			if [ -n "$$pids" ]; then \
				kill $$pids 2>/dev/null || true; \
			fi; \
			wait 2>/dev/null || true; \
		}; \
		trap cleanup INT TERM EXIT; \
		npx tsc -w -p tsconfig.json > $(WATCH_LOG_FILE) 2>&1 & \
		python3 -m http.server $(PORT) > $(SERVER_LOG_FILE) 2>&1 & \
		echo "dev mode started"; \
		echo "url: http://127.0.0.1:$(PORT)/index.html"; \
		echo "watch log: $(WATCH_LOG_FILE)"; \
		echo "server log: $(SERVER_LOG_FILE)"; \
		wait

# detached watch 시작
watch-start:
	@mkdir -p $(PID_DIR)
	@if [ -f $(WATCH_PID_FILE) ] && kill -0 "$$(cat $(WATCH_PID_FILE))" 2>/dev/null; then \
		echo "tsc watch already running: pid $$(cat $(WATCH_PID_FILE))"; \
	else \
		nohup npx tsc -w -p tsconfig.json > $(WATCH_LOG_FILE) 2>&1 < /dev/null & \
		echo $$! > $(WATCH_PID_FILE); \
		echo "started tsc watch: pid $$(cat $(WATCH_PID_FILE))"; \
		echo "log: $(WATCH_LOG_FILE)"; \
	fi

# detached watch 종료
watch-stop:
	@if [ -f $(WATCH_PID_FILE) ]; then \
		pid=$$(cat $(WATCH_PID_FILE)); \
		if kill -0 "$$pid" 2>/dev/null; then \
			kill "$$pid"; \
			echo "stopped tsc watch: pid $$pid"; \
		else \
			echo "tsc watch pid file was stale: $$pid"; \
		fi; \
		rm -f $(WATCH_PID_FILE); \
	else \
		echo "tsc watch is not running"; \
	fi

# detached 정적 서버 시작
serve-start:
	@mkdir -p $(PID_DIR)
	@if [ -f $(SERVER_PID_FILE) ] && kill -0 "$$(cat $(SERVER_PID_FILE))" 2>/dev/null; then \
		echo "http server already running: pid $$(cat $(SERVER_PID_FILE))"; \
		echo "url: http://127.0.0.1:$(PORT)/index.html"; \
	else \
		nohup python3 -m http.server $(PORT) > $(SERVER_LOG_FILE) 2>&1 < /dev/null & \
		echo $$! > $(SERVER_PID_FILE); \
		echo "started http server: pid $$(cat $(SERVER_PID_FILE))"; \
		echo "url: http://127.0.0.1:$(PORT)/index.html"; \
		echo "log: $(SERVER_LOG_FILE)"; \
	fi

# detached 정적 서버 종료
serve-stop:
	@if [ -f $(SERVER_PID_FILE) ]; then \
		pid=$$(cat $(SERVER_PID_FILE)); \
		if kill -0 "$$pid" 2>/dev/null; then \
			kill "$$pid"; \
			echo "stopped http server: pid $$pid"; \
		else \
			echo "http server pid file was stale: $$pid"; \
		fi; \
		rm -f $(SERVER_PID_FILE); \
	else \
		echo "http server is not running"; \
	fi

# detached 개발 모드 시작
dev-start:
	@$(MAKE) watch-start
	@$(MAKE) serve-start

# detached 개발 모드 종료
dev-stop:
	@$(MAKE) watch-stop
	@$(MAKE) serve-stop

status:
	@mkdir -p $(PID_DIR)
	@if [ -f $(WATCH_PID_FILE) ] && kill -0 "$$(cat $(WATCH_PID_FILE))" 2>/dev/null; then \
		echo "tsc watch: running (pid $$(cat $(WATCH_PID_FILE)))"; \
	else \
		echo "tsc watch: stopped"; \
	fi
	@if [ -f $(SERVER_PID_FILE) ] && kill -0 "$$(cat $(SERVER_PID_FILE))" 2>/dev/null; then \
		echo "http server: running (pid $$(cat $(SERVER_PID_FILE)))"; \
		echo "url: http://127.0.0.1:$(PORT)/index.html"; \
	else \
		echo "http server: stopped"; \
	fi
