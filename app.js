import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import {Chess} from 'chess.js';
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { disconnect, title } from 'process';
import { compareSync } from 'bcryptjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const chess = new Chess();

let players = {};
let currentPlayer = 'w';

app.set("view engine", "ejs");
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(join(__dirname, "public")));

app.get('/', (req, res) => {
    res.render('index', {title: 'Chess Game'});
});

io.on('connection', (uniquesocket) => {
    console.log('A user connected:');
    if(!players.white){
        players.white = uniquesocket.id;
        uniquesocket.emit('playerRole', 'w');
    }
    else if(!players.black){
        players.black = uniquesocket.id;
        uniquesocket.emit('playerRole', 'b');
    } else {
        uniquesocket.emit('spectatorRole');
    }

    uniquesocket.on('disconnect', function() {
        if(uniquesocket.id === players.white) {
            delete players.white;
            console.log('White player disconnected');
        }
        else if(uniquesocket.id === players.black) {
            delete players.black;
            console.log('Black player disconnected');
        }
        else {
            console.log('A spectator disconnected');
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            if(chess.turn() === 'w' && uniquesocket.id !== players.white) {
                uniquesocket.emit('error', 'It is not your turn!');
                return;
            }
            if(chess.turn() === 'b' && uniquesocket.id !== players.black) {
                uniquesocket.emit('error', 'It is not your turn!');
                return;
            }

            const result = chess.move(move);
            if(result){
                currentPlayer = chess.turn();
                io.emit('move', move);
                io.emit('updateBoard', chess.fen());
            }
            else {
                console.log('Invalid move attempted:', move);
                uniquesocket.emit('Invalid move!', move);
            }
        } catch (err) {
            console.log('Error processing move:', err);
            uniquesocket.emit("Invalid move!", move);
        }
    })
})

server.listen("https://chess-teal-xi.vercel.app/", () => {
    console.log('Server is running on http://localhost:3000');
});