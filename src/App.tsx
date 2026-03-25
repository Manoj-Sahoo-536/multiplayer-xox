/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'motion/react';
import { Copy, Users, Play, RotateCcw, Home } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameStatus = 'lobby' | 'waiting' | 'playing' | 'finished';
type PlayerSymbol = 'X' | 'O' | null;

let socket: Socket;

export default function App() {
  const [status, setStatus] = useState<GameStatus>('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [symbol, setSymbol] = useState<PlayerSymbol>(null);
  const [board, setBoard] = useState<PlayerSymbol[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<PlayerSymbol>('X');
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Connect to the same host/port
    socket = io();

    socket.on('roomCreated', ({ roomId, symbol }) => {
      setRoomId(roomId);
      setSymbol(symbol);
      setStatus('waiting');
      setError('');
    });

    socket.on('roomJoined', ({ roomId, symbol }) => {
      setRoomId(roomId);
      setSymbol(symbol);
      setError('');
    });

    socket.on('gameStart', ({ board, turn }) => {
      setBoard(board);
      setTurn(turn);
      setStatus('playing');
      setWinner(null);
      setWinningLine(null);
    });

    socket.on('gameState', ({ board, turn, winner, winningLine }) => {
      setBoard(board);
      setTurn(turn);
      if (winner) {
        setWinner(winner);
        setWinningLine(winningLine);
        setStatus('finished');
      }
    });

    socket.on('playerDisconnected', () => {
      setError('Opponent disconnected');
      setStatus('lobby');
      setRoomId('');
      setSymbol(null);
      setBoard(Array(9).fill(null));
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = () => {
    socket.emit('createRoom');
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      socket.emit('joinRoom', joinCode.trim().toUpperCase());
    }
  };

  const makeMove = (index: number) => {
    if (status === 'playing' && turn === symbol && !board[index] && !winner) {
      socket.emit('makeMove', { roomId, index });
    }
  };

  const restartGame = () => {
    socket.emit('restartGame', roomId);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const goHome = () => {
    setStatus('lobby');
    setRoomId('');
    setSymbol(null);
    setJoinCode('');
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setError('');
    socket.disconnect();
    socket.connect(); // Reconnect to get a fresh socket
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-4 font-sans selection:bg-neutral-800">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Tic-Tac-Toe</h1>
          <p className="text-neutral-400">Real-time multiplayer</p>
        </div>

        {/* Error Toast */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Lobby State */}
        {status === 'lobby' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" /> Start a New Game
              </h2>
              <button
                onClick={createRoom}
                className="w-full bg-white text-black hover:bg-neutral-200 transition-colors font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2"
              >
                Create Room
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-950 text-neutral-500">or join existing</span>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Join a Friend
              </h2>
              <form onSubmit={joinRoom} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-700 transition-all font-mono uppercase tracking-wider"
                />
                <button
                  type="submit"
                  disabled={joinCode.length < 3}
                  className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium px-6 rounded-xl"
                >
                  Join
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Waiting State */}
        {status === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-xl text-center"
          >
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-6 h-6 border-2 border-neutral-400 border-t-white rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Waiting for opponent</h2>
            <p className="text-neutral-400 mb-8">Share this code with your friend to play</p>
            
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center justify-between mb-8">
              <span className="font-mono text-3xl tracking-widest font-bold text-white">{roomId}</span>
              <button
                onClick={copyRoomId}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                title="Copy Code"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={goHome}
              className="text-neutral-500 hover:text-neutral-300 transition-colors text-sm"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Playing & Finished State */}
        {(status === 'playing' || status === 'finished') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Game Header */}
            <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl",
                  symbol === 'X' ? "bg-blue-500/20 text-blue-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  {symbol}
                </div>
                <div className="text-sm">
                  <p className="text-neutral-400">You are</p>
                  <p className="font-semibold">Player {symbol}</p>
                </div>
              </div>

              <div className="text-right">
                {status === 'playing' ? (
                  <div className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    turn === symbol 
                      ? "bg-white text-black" 
                      : "bg-neutral-800 text-neutral-400"
                  )}>
                    {turn === symbol ? "Your Turn" : "Opponent's Turn"}
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-white">
                    Game Over
                  </div>
                )}
              </div>
            </div>

            {/* Board */}
            <div className="aspect-square bg-neutral-900 border border-neutral-800 p-4 rounded-3xl shadow-2xl">
              <div className="grid grid-cols-3 gap-3 h-full">
                {board.map((cell, i) => {
                  const isWinningCell = winningLine?.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => makeMove(i)}
                      disabled={status !== 'playing' || !!cell || turn !== symbol}
                      className={cn(
                        "relative flex items-center justify-center text-5xl font-bold rounded-2xl transition-all duration-200",
                        !cell && status === 'playing' && turn === symbol && "hover:bg-neutral-800 cursor-pointer",
                        !cell && (status !== 'playing' || turn !== symbol) && "cursor-default",
                        cell && "bg-neutral-950",
                        isWinningCell && cell === 'X' && "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50",
                        isWinningCell && cell === 'O' && "bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/50",
                        cell === 'X' && !isWinningCell && "text-blue-400",
                        cell === 'O' && !isWinningCell && "text-rose-400"
                      )}
                    >
                      {cell && (
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          {cell}
                        </motion.span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Game Over Controls */}
            {status === 'finished' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl text-center space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold mb-1">
                    {winner === 'draw' ? "It's a Draw!" : winner === symbol ? "You Won!" : "You Lost!"}
                  </h3>
                  <p className="text-neutral-400">
                    {winner === 'draw' ? "Good game." : winner === symbol ? "Congratulations!" : "Better luck next time."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={goHome}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white transition-colors font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" /> Home
                  </button>
                  <button
                    onClick={restartGame}
                    className="flex-1 bg-white hover:bg-neutral-200 text-black transition-colors font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Play Again
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
