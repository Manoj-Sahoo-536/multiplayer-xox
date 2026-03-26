/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion } from 'motion/react';
import { Copy, Users, Play, RotateCcw, Home } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

let socket;

export default function App() {
  const [status, setStatus] = useState('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [error, setError] = useState('');
  const [scores, setScores] = useState({});
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const [pickerAction, setPickerAction] = useState(null);
  const [copied, setCopied] = useState(false);

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

    socket.on('gameStart', ({ board, turn, scores }) => {
      setBoard(board);
      setTurn(turn);
      setStatus('playing');
      setWinner(null);
      setWinningLine(null);
      setScores(scores);
    });

    socket.on('gameState', ({ board, turn, winner, winningLine, scores }) => {
      setBoard(board);
      setTurn(turn);
      setScores(scores);
      if (winner) {
        setWinner(winner);
        setWinningLine(winningLine);
        setStatus('finished');
      } else {
        setWinner(null);
        setWinningLine(null);
        setStatus('playing');
      }
    });

    socket.on('gameRestart', ({ symbol, board, turn, scores }) => {
      setSymbol(symbol);
      setBoard(board);
      setTurn(turn);
      setWinner(null);
      setWinningLine(null);
      setStatus('playing');
      setScores(scores);
    });

    socket.on('playerDisconnected', () => {
      setError('Opponent disconnected');
      setStatus('lobby');
      setRoomId('');
      setSymbol(null);
      setBoard(Array(9).fill(null));
      setScores({});
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = () => {
    setPickerAction('create');
    setShowSymbolPicker(true);
  };

  const handleSymbolSelect = (selectedSymbol) => {
    setShowSymbolPicker(false);
    if (pickerAction === 'create') {
      socket.emit('createRoom', { selectedSymbol });
    } else if (pickerAction === 'restart') {
      socket.emit('restartGame', { roomId, selectedSymbol });
    }
    setPickerAction(null);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      socket.emit('joinRoom', joinCode.trim().toUpperCase());
    }
  };

  const makeMove = (index) => {
    if (status === 'playing' && turn === symbol && !board[index] && !winner) {
      socket.emit('makeMove', { roomId, index });
    }
  };

  const restartGame = () => {
    setPickerAction('restart');
    setShowSymbolPicker(true);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    setScores({});
    socket.disconnect();
    socket.connect(); // Reconnect to get a fresh socket
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-4 font-sans selection:bg-neutral-800">
      <div className="w-full max-w-md">
        {/* Symbol Picker Modal */}
        {showSymbolPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSymbolPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-2 text-center">Choose Your Symbol</h2>
              <p className="text-neutral-400 text-center mb-8">X always starts first</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleSymbolSelect('X')}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border-2 border-blue-500 text-blue-400 active:scale-95 transition-all duration-200 font-bold py-8 px-4 rounded-xl text-4xl"
                >
                  X
                </button>
                <button
                  onClick={() => handleSymbolSelect('O')}
                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 border-2 border-rose-500 text-rose-400 active:scale-95 transition-all duration-200 font-bold py-8 px-4 rounded-xl text-4xl"
                >
                  O
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

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
                className="w-full bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all duration-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2"
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
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:scale-95 transition-all duration-200 font-mono uppercase tracking-wider"
                />
                <button
                  type="submit"
                  disabled={joinCode.length < 3}
                  className="bg-white text-black hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400 transition-all duration-200 font-medium px-6 rounded-xl"
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
                className="p-2 hover:bg-neutral-800 active:scale-95 rounded-lg transition-all duration-200 text-neutral-400 hover:text-white relative"
                title="Copy Code"
              >
                <Copy className="w-5 h-5" />
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded whitespace-nowrap"
                  >
                    Copied!
                  </motion.span>
                )}
              </button>
            </div>

            <button
              onClick={goHome}
              className="text-neutral-500 hover:text-neutral-300 active:scale-95 transition-all duration-200 text-sm"
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
                  <p className="text-neutral-400">You</p>
                  <p className="font-semibold text-lg">{scores[socket?.id] || 0}</p>
                </div>
              </div>

              <div className="text-center">
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

              <div className="flex items-center gap-3">
                <div className="text-sm text-right">
                  <p className="text-neutral-400">Opponent</p>
                  <p className="font-semibold text-lg">{Object.values(scores).find((_, i) => Object.keys(scores)[i] !== socket?.id) || 0}</p>
                </div>
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl",
                  symbol === 'X' ? "bg-rose-500/20 text-rose-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {symbol === 'X' ? 'O' : 'X'}
                </div>
              </div>
            </div>

            {/* Board */}
            <div className="aspect-square bg-neutral-900 border border-neutral-800 p-4 rounded-3xl shadow-2xl">
              <div className="grid grid-cols-3 gap-2 h-full">
                {board.map((cell, i) => {
                  const isWinningCell = winningLine?.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => makeMove(i)}
                      disabled={status !== 'playing' || !!cell || turn !== symbol}
                      className={cn(
                        "relative flex items-center justify-center text-5xl font-bold rounded-xl transition-all duration-200 border-2",
                        !cell && status === 'playing' && turn === symbol && "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 cursor-pointer active:scale-95",
                        !cell && (status !== 'playing' || turn !== symbol) && "border-neutral-800 cursor-default",
                        cell && "bg-neutral-950 border-neutral-800",
                        isWinningCell && cell === 'X' && "bg-blue-500/20 border-blue-500 text-blue-400",
                        isWinningCell && cell === 'O' && "bg-rose-500/20 border-rose-500 text-rose-400",
                        cell === 'X' && !isWinningCell && "border-neutral-800 text-blue-400",
                        cell === 'O' && !isWinningCell && "border-neutral-800 text-rose-400"
                      )}
                    >
                      <motion.span
                        initial={cell ? { scale: 0.5, opacity: 0 } : false}
                        animate={cell ? { scale: 1, opacity: 1 } : { opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute"
                      >
                        {cell}
                      </motion.span>
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
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white transition-all duration-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" /> Home
                  </button>
                  <button
                    type="button"
                    onClick={restartGame}
                    className="flex-1 bg-white hover:bg-neutral-200 active:scale-95 text-black transition-all duration-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2"
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
