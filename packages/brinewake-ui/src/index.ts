// Installs this game's theme for kiln-ui's components. A bundler may only keep this import because
// package.json lists this file under sideEffects.
import './styles/theme.scss';

export { GameCanvas } from './GameCanvas/GameCanvas';
export { Hud } from './Hud/Hud';
export { Overlay } from './Overlay/Overlay';
export { Shipyard } from './Shipyard/Shipyard';
