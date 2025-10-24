#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ ! -d "ITOA_Dashboard" ]; then
    echo "Error: Run this from the Amit directory"
    exit 1
fi

echo -e "${BLUE}Backend Setup...${NC}"
cd ITOA_Dashboard/src/backend

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
fi

echo -e "${GREEN}Starting Backend on http://127.0.0.1:8000${NC}"
python3 -m uvicorn app:app --reload --host 127.0.0.1 --port 8000 > /tmp/itoa-backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 3

echo ""
echo -e "${BLUE}Frontend Setup...${NC}"
cd ../..

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}Starting Frontend on http://localhost:3002${NC}"
echo ""
echo -e "${GREEN}ItoA Dashboard Running${NC}"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3002${NC}"
echo -e "   Backend:  ${GREEN}http://127.0.0.1:8000${NC}"
echo -e "   API Docs: ${GREEN}http://127.0.0.1:8000/docs${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "   Backend: /tmp/itoa-backend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

npm run dev

cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}Servers stopped${NC}"
    exit 0
}

trap cleanup INT TERM
