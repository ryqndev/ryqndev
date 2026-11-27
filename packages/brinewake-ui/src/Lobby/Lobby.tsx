import { COAT_CSS, hostCrew, joinCrew, leaveCrew, MAX_CREW } from '@ryqndev/brinewake-game';
import clsx from 'clsx';
import { type FormEvent, memo, type SyntheticEvent, useState } from 'react';

import { useHud } from '../hooks/useHud';
import cn from './Lobby.module.scss';

const NAME_KEY = 'brinewake:name';
/** A link that brings someone straight to the join box with the code filled in: `?join=CODE`. */
const INVITED = new URLSearchParams(window.location.search).get('join') ?? '';

const remembered = () => {
    try {
        return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
        return '';
    }
};
const remember = (name: string) => {
    try {
        localStorage.setItem(NAME_KEY, name);
    } catch {
        /* nowhere to keep it: it is asked for again next time */
    }
};

// the lobby sits on a menu where a click anywhere starts play: nothing done in it may count as that click
const apart = (e: SyntheticEvent) => e.stopPropagation();

/** Everyone in the crew, each in the colour of the coat they wear. */
const Roster = memo(function Roster() {
    const shipmates = useHud((s) => s.shipmates);

    return (
        <ul className={cn.roster}>
            {shipmates.map((mate, i) => (
                <li key={mate.id}>
                    <i style={{ background: COAT_CSS[mate.id % COAT_CSS.length] }} />
                    {mate.name}
                    {i === 0 && <span>you</span>}
                    {mate.id === 0 && i > 0 && <span>captain</span>}
                </li>
            ))}
        </ul>
    );
});

/**
 * Sailing with friends, from a menu screen: open this game to a crew, or join someone else's by its
 * code. Once in a crew it shows the code to pass on, who is aboard, and the way out.
 */
export const Lobby = memo(function Lobby() {
    const net = useHud((s) => s.net);
    const drydock = useHud((s) => s.drydock);
    const mode = useHud((s) => s.mode);
    const [name, setName] = useState(remembered);
    const [code, setCode] = useState(INVITED);
    const [copied, setCopied] = useState(false);

    // the drydock is a captain's own business, and a crew is only joined from the title screen
    if (drydock || (net.role === 'off' && mode !== 'title' && mode !== 'pause')) return null;

    const host = () => {
        remember(name);
        hostCrew(name);
    };
    const join = (e: FormEvent) => {
        e.preventDefault();
        remember(name);
        joinCrew(code, name);
    };
    const invite = () => {
        const link = `${window.location.origin}${window.location.pathname}?join=${net.code}`;
        void navigator.clipboard?.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        });
    };

    return (
        <div className={cn.lobby} onClick={apart} onKeyDown={apart}>
            <div className={cn.heading}>Sail with friends</div>
            {net.role === 'off' ? (
                <>
                    <input className={cn.field} disabled={net.busy} maxLength={16} placeholder="Your name" spellCheck={false} value={name} onChange={(e) => setName(e.target.value)} />
                    <button className={cn.action} disabled={net.busy} onClick={host}>
                        Host a crew
                    </button>
                    {mode === 'title' && (
                        <form className={cn.join} onSubmit={join}>
                            <input
                                autoCapitalize="characters"
                                className={clsx(cn.field, cn.code)}
                                disabled={net.busy}
                                maxLength={8}
                                placeholder="CODE"
                                spellCheck={false}
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                            />
                            <button className={cn.action} disabled={net.busy || !code.trim()} type="submit">
                                Join
                            </button>
                        </form>
                    )}
                    {net.busy && <div className={cn.note}>Signalling…</div>}
                    {net.error && <div className={cn.error}>{net.error}</div>}
                    <div className={cn.note}>Up to {MAX_CREW} to a ship · one sails her, the rest man her guns</div>
                </>
            ) : (
                <>
                    <div className={cn.note}>{net.role === 'host' ? 'Your crew sails under' : 'Aboard the crew sailing under'}</div>
                    <div className={cn.badge}>{net.code}</div>
                    {net.role === 'host' && (
                        <button className={cn.action} onClick={invite}>
                            {copied ? 'Link copied' : 'Copy invite link'}
                        </button>
                    )}
                    <Roster />
                    <button className={cn.leave} onClick={leaveCrew}>
                        {net.role === 'host' ? 'Pay off the crew' : 'Leave the crew'}
                    </button>
                </>
            )}
        </div>
    );
});
