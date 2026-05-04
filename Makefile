HOST=$(shell grep '^HOST=' .env | cut -d '=' -f 2)

install:
	@echo "Building..."
	npm run build
	@echo "Done"

deploy:
	@echo "Deploying to $(HOST)..."
	ssh root@$(HOST) "mkdir -p /opt/abnative"
	scp docker-compose.yml root@$(HOST):/opt/abnative/
	rsync -avz --progress dist/ root@$(HOST):/opt/abnative/dist/
	rsync -avz --progress public/ root@$(HOST):/opt/abnative/public/
	scp package*.json root@$(HOST):/opt/abnative/
	ssh root@$(HOST) "cd /opt/abnative && npm ci --omit=dev"
	ssh root@$(HOST) "cd /opt/abnative && docker compose down && docker compose up -d"
	@echo "Deployed!"

dev:
	npx tsx watch src/server.ts

build:
	npx tsc
	cp -r public dist/
