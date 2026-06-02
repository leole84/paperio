const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// 방별 게임 상태 저장 (메모리 관리)
const rooms = {};

io.on('connection', (socket) => {
    let currentRoom = null;
    let playerId = socket.id;

    // 1. 방 만들기 / 입장하기
    socket.on('joinRoom', (roomCode) => {
        currentRoom = roomCode;
        socket.join(roomCode);

        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: {} };
        }

        // 새 플레이어 초기화 (무작위 위치와 색상)
        rooms[roomCode].players[playerId] = {
            id: playerId,
            x: Math.floor(Math.random() * 500) + 50,
            y: Math.floor(Math.random() * 500) + 50,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            score: 0
        };

        // 방 안에 있는 모든 사람에게 플레이어 목록 전송
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    });

    // 2. 플레이어 이동 동기화
    socket.on('move', (data) => {
        if (currentRoom && rooms[currentRoom] && rooms[currentRoom].players[playerId]) {
            let player = rooms[currentRoom].players[playerId];
            player.x += data.dx;
            player.y += data.dy;

            // 벽 충돌 방지 (맵 크기 800x600 기준)
            player.x = Math.max(0, Math.min(800, player.x));
            player.y = Math.max(0, Math.min(600, player.y));

            io.to(currentRoom).emit('updatePlayers', rooms[currentRoom].players);
        }
    });

    // 3. 접속 종료 처리
    socket.on('disconnect', () => {
        if (currentRoom && rooms[currentRoom] && rooms[currentRoom].players[playerId]) {
            delete rooms[currentRoom].players[playerId];
            io.to(currentRoom).emit('updatePlayers', rooms[currentRoom].players);
            
            // 빈 방이면 삭제
            if (Object.keys(rooms[currentRoom].players).length === 0) {
                delete rooms[currentRoom];
            }
        }
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`서버가 켜졌습니다! http://localhost:${PORT}`);
});