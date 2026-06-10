## run everything with one command 
    docker compose up --build

## run in background
    docker compose up -d --build

## stop everything 
    docker compose down

## rebuild only when needed 
    docker compose up   

## rebuild frontend (works for Julia)
    docker compose up --build frontend

## one liner to flush everything and rebuild app
    docker compose down --volumes --remove-orphans && docker compose build --no-cache && docker compose up

## clear cache
    docker compose down -v
    docker rm -f $(docker ps -aq)
    docker system prune -a -f
    
## or just run everything with this command in bash
    chmod +x run.sh
    ./run.sh

