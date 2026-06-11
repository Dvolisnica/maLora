// ─── Glavni ekran partije ───────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore.js';
import { useGameStore } from '../store/useGameStore.js';
import { useRoomSync } from '../hooks/useRoomSync.js';
import { useTurnTimer } from '../hooks/useTurnTimer.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { useBotPlayer } from '../hooks/useBotPlayer.js';
import {
  submitMove, submitContract, submitContinue, rematch,
  castVote, clearVotes, closeRoom, leaveRoom, cancelSeatOnDisconnect,
} from '../firebase/rtdb.js';
import { legalMoves, availableContracts, finalRanking } from '../game/engine.js';
import { CONTRACTS } from '../game/contracts.js';
import HandFan from '../components/HandFan.jsx';
import PlayerSeat from '../components/PlayerSeat.jsx';
import TrickArea from '../components/TrickArea.jsx';
import LoraBoard from '../components/LoraBoard.jsx';
import ContractPicker from '../components/ContractPicker.jsx';
import ScoreBoard from '../components/ScoreBoard.jsx';
import Chat from '../components/Chat.jsx';
import Confetti from '../components/Confetti.jsx';
import VoteBanner from '../components/VoteBanner.jsx';

/** Kad se štih kompletira, stanje odmah preskoči na novi štih — ovaj hook
 *  kratko zadrži prikaz sve 4 karte pa ih "pokupi" prema pobjedniku. */
function useTrickDisplay(game) {
  const [display, setDisplay] = useState(null);
  const prev = useRef({});
  useEffect(() => {
    const cur = game?.trick?.cards || {};
    const p = prev.current;
    if (Object.keys(p).length === 3 && Object.keys(cur).length === 0 && game?.lastMove) {
      const full = { ...p, [game.lastMove.seat]: game.lastMove.card };
      setDisplay({ cards: full, collectTo: null });
      const t1 = setTimeout(() => setDisplay({ cards: {}, collectTo: game.lastTrickWinner }), 750);
      const t2 = setTimeout(() => setDisplay(null), 1500);
      prev.current = cur;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prev.current = cur;
  }, [game?.lastMove?.at, game?.status]);
  return display;
}

export default function Game() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const { room, game, mySeat: getSeat, reset } = useGameStore();
  const haptics = useHaptics();
  const [showScore, setShowScore] = useState(false);

  useRoomSync(roomId);

  const mySeat = getSeat(user.uid);
  const isHost = room?.meta?.hostUid === user.uid;
  const remaining = useTurnTimer(roomId, game, mySeat, isHost);
  const trickDisplay = useTrickDisplay(game);

  // Host klijent vuče poteze za botove
  useBotPlayer(roomId, game, isHost);

  // Tokom partije sjedište ostaje i nakon prekida veze (reconnect)
  useEffect(() => {
    if (mySeat >= 0) cancelSeatOnDisconnect(roomId, mySeat).catch(() => {});
  }, [roomId, mySeat]);

  // Vibracija kad dođe moj red
  const wasMyTurn = useRef(false);
  useEffect(() => {
    const my = game?.status === 'playing' && game.turnSeat === mySeat;
    if (my && !wasMyTurn.current) haptics.turn();
    wasMyTurn.current = my;
  }, [game?.turnSeat, game?.status]);

  // Auto-PASS u Lori (nema validnog poteza)
  useEffect(() => {
    if (game?.status === 'playing' && game.contract === 'LORA' && game.turnSeat === mySeat) {
      const lm = legalMoves(game, mySeat);
      if (lm.length === 1 && lm[0] === 'PASS') {
        const t = setTimeout(() => submitMove(roomId, mySeat, 'PASS'), 1100);
        return () => clearTimeout(t);
      }
    }
  }, [game?.turnSeat, game?.lastMove?.at, game?.status]);

  // dealOver → host automatski nastavlja nakon 6 s
  useEffect(() => {
    if (game?.status === 'dealOver' && isHost) {
      const t = setTimeout(() => submitContinue(roomId), 6000);
      return () => clearTimeout(t);
    }
  }, [game?.status, game?.dealIndex]);

  // Glasanje: host izvršava ishod (botovi ne glasaju — broje se samo ljudi)
  useEffect(() => {
    if (!isHost || !room?.votes || !game) return;
    const humans = (game.players || []).filter((p) => p && !p.isBot).length || 4;
    const restart = Object.values(room.votes.restart || {});
    if (restart.length >= humans && restart.every(Boolean)) {
      clearVotes(roomId, 'restart').then(() => rematch(roomId, room));
    }
    const leave = Object.values(room.votes.leave || {}).filter(Boolean);
    if (leave.length >= Math.max(1, Math.ceil(humans * 0.6))) closeRoom(roomId);
  }, [room?.votes]);

  // Soba zatvorena / obrisana → nazad
  useEffect(() => {
    if (room === null || room?.meta?.status === 'closed') { reset(); nav('/'); }
  }, [room]);

  if (!room || !game || mySeat < 0) {
    return <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}><p className="muted">Učitavanje partije…</p></div>;
  }

  const players = game.players;
  const rel = (offset) => (mySeat + offset) % 4; // relativna sjedišta
  const hand = game.hands[mySeat] || [];
  const myTurn = game.status === 'playing' && game.turnSeat === mySeat;
  const legal = myTurn ? legalMoves(game, mySeat) : [];
  const contract = game.contract ? CONTRACTS[game.contract] : null;
  const ranking = game.status === 'gameOver' ? finalRanking(game) : null;
  const iWon = ranking && ranking[0].seat === mySeat;

  const play = (card) => submitMove(roomId, mySeat, card);

  const seatProps = (seat) => ({
    player: players[seat],
    cards: (game.hands[seat] || []).length,
    score: game.scores[seat] || 0,
    isTurn: game.status === 'playing' && game.turnSeat === seat,
    isDealer: game.dealerSeat === seat && game.status !== 'gameOver',
    remaining,
  });

  return (
    <div className="page" style={{ padding: '8px 8px 0', maxWidth: 680, gap: 6 }}>
      {/* Header */}
      <header className="row spread" style={{ padding: '0 6px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => castVote(roomId, 'leave', user.uid, true)} aria-label="Glasaj za prekid partije">✕</button>
        <span style={{ fontSize: 14 }} aria-live="polite">
          {contract ? <><strong style={{ color: 'var(--accent)' }}>{contract.name}</strong> · {Math.min(game.dealIndex + 1, 28)}/28</> : <span className="muted">dijeljenje {Math.min(game.dealIndex + 1, 28)}/28</span>}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowScore(true)} aria-label="Rezultati">📊</button>
      </header>

      {/* Info: koja se igra trenutno igra */}
      {contract && game.status !== 'gameOver' && (
        <div className="muted" style={{ textAlign: 'center', fontSize: 11.5, padding: '0 12px' }} aria-live="polite">
          {contract.icon} {contract.name} — {contract.desc}
        </div>
      )}

      <VoteBanner roomId={roomId} votes={room.votes} type="restart" total={players.filter((p) => p && !p.isBot).length} />
      <VoteBanner roomId={roomId} votes={room.votes} type="leave" total={players.filter((p) => p && !p.isBot).length} />

      {/* Protivnik preko puta */}
      <div className="row" style={{ justifyContent: 'center' }}>
        <PlayerSeat {...seatProps(rel(2))} compact />
      </div>

      {/* Lijevo / sto / desno */}
      <div className="row" style={{ alignItems: 'center', flex: 1, minHeight: 200 }}>
        <PlayerSeat {...seatProps(rel(1))} compact />
        <div className="table-felt" style={{ flex: 1, minHeight: 190, display: 'grid', placeItems: 'center', margin: '0 4px' }}>
          {game.status === 'choosing' && mySeat !== game.dealerSeat && (
            <p className="muted" style={{ textAlign: 'center', padding: 12 }} aria-live="polite">
              <strong>{players[game.dealerSeat]?.name}</strong> gleda karte i bira igru… ({remaining}s)
            </p>
          )}
          {game.contract === 'LORA' && game.status === 'playing' && <LoraBoard lora={game.lora} />}
          {game.contract !== 'LORA' && (game.status === 'playing' || trickDisplay) && (
            <TrickArea
              trick={trickDisplay ? { cards: trickDisplay.cards } : game.trick}
              mySeat={mySeat}
              collectTo={trickDisplay?.collectTo ?? null}
            />
          )}
        </div>
        <PlayerSeat {...seatProps(rel(3))} compact />
      </div>

      {/* Moj red + timer */}
      <div style={{ textAlign: 'center', minHeight: 24 }} aria-live="polite">
        {myTurn && (
          <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>
            Tvoj red! {legal[0] === 'PASS' ? '— nemaš poteza (PAS)' : `(${remaining}s)`}
          </motion.span>
        )}
      </div>
      {myTurn && (
        <div className={`timer-bar ${remaining <= 10 ? 'timer-low' : ''}`} style={{ margin: '0 20px' }}>
          <div style={{ width: `${(remaining / 30) * 100}%` }} />
        </div>
      )}

      {/* Moja ruka */}
      <HandFan hand={hand} legal={legal} myTurn={myTurn} onPlay={play} />
      <div className="row" style={{ justifyContent: 'center', gap: 8, paddingBottom: 8 }}>
        <span style={{ fontSize: 13 }} className="muted">
          {players[mySeat]?.name} · <strong style={{ color: 'var(--accent)' }}>{game.scores[mySeat] || 0}</strong> bodova
        </span>
      </div>

      <Chat roomId={roomId} />

      {/* Diler bira kontrat */}
      {game.status === 'choosing' && mySeat === game.dealerSeat && (
        <ContractPicker
          available={availableContracts(game)}
          remaining={remaining}
          onPick={(c) => submitContract(roomId, mySeat, c)}
        />
      )}

      {/* Kraj dijeljenja */}
      {game.status === 'dealOver' && (
        <div className="overlay" role="dialog" aria-label="Rezultat dijeljenja">
          <motion.div className="card-panel" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ width: 'min(94vw, 380px)', textAlign: 'center' }}>
            <h3 style={{ margin: '4px 0' }}>{CONTRACTS[game.lastContract]?.name}</h3>
            <div style={{ display: 'grid', gap: 6, margin: '12px 0' }}>
              {players.map((p, i) => (
                <div key={i} className="row spread">
                  <span>{p.name}</span>
                  <span>
                    <strong style={{ color: (game.dealScores?.[i] || 0) > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                      +{game.dealScores?.[i] || 0}
                    </strong>
                    <span className="muted"> → {game.scores[i] || 0}</span>
                  </span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => submitContinue(roomId)} style={{ width: '100%' }}>Nastavi ▸</button>
          </motion.div>
        </div>
      )}

      {/* Kraj partije */}
      {game.status === 'gameOver' && (
        <div className="overlay" role="dialog" aria-label="Kraj partije">
          {iWon && <Confetti />}
          <motion.div className="card-panel" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: 'min(94vw, 400px)', textAlign: 'center' }}>
            <div style={{ fontSize: 52 }} aria-hidden="true">{iWon ? '🏆' : '🎴'}</div>
            <h2 style={{ margin: '6px 0' }}>{iWon ? 'Pobjeda!' : `Pobjednik: ${players[ranking[0].seat].name}`}</h2>
            <div style={{ display: 'grid', gap: 6, margin: '14px 0' }}>
              {ranking.map((r, place) => (
                <div key={r.seat} className="row spread" style={{ background: r.seat === mySeat ? 'var(--surface)' : 'transparent', borderRadius: 10, padding: '6px 10px' }}>
                  <span>{['🥇', '🥈', '🥉', '4.'][place]} {players[r.seat].name}</span>
                  <strong style={{ color: 'var(--accent)' }}>{r.score}</strong>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => castVote(roomId, 'restart', user.uid, true)}>🔄 Revanš</button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={async () => { await leaveRoom(roomId, user); reset(); nav('/'); }}>Izađi</button>
            </div>
          </motion.div>
        </div>
      )}

      {showScore && <ScoreBoard game={game} onClose={() => setShowScore(false)} />}
    </div>
  );
}
