HOST ?= $(shell grep '^HOST=' .env 2>/dev/null | cut -d '=' -f 2)

install:
	@echo "Installing server..."
	-ssh root@$(HOST) "mkdir -p /opt/abnative"
	scp ./.env root@$(HOST):/opt/abnative/.env
	scp ./docker-compose.yml root@$(HOST):/opt/abnative/docker-compose.yml


build:
	npx tsc
	cp -r public dist/

deploy:
	@echo "Deploying to $(HOST)..."
	ssh root@$(HOST) "docker pull ghcr.io/mikhail-angelov/abnative-test-demo:latest"
	-ssh root@$(HOST) "cd /opt/abnative && docker compose down"
	ssh root@$(HOST) "cd /opt/abnative && docker compose up -d"


dev:
	npx tsx watch src/server.ts

.PHONY: install build deploy dev
