# FightFlo

Reactive fight training timer for Muay Thai, boxing, kickboxing and MMA.

Shadowboxing that fights back — randomized beeps and visual signals simulate fight rhythm, pressure, reactions and pacing.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Web Audio API (synthesized premium tones)
- Local storage for settings
- PWA-ready (manifest + service worker)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone for the best experience.

## Features

- **Fight styles**: Muay Thai, Boxing, MMA, Kickboxing — each with unique signal weighting
- **Modes**: Easy, Hard, Stadium — escalating intensity and chaos
- **Signals**: Attack, Defend, Move, Burnout, Pressure, Reset
- **Challenges**: Bangkok Stadium, Pressure Fighter, Counter Sniper, Five Round War, Last Round Hell
- **Audio**: Cinematic synthesized beeps, gym/crowd ambience, trainer claps
- **Haptics**: Vibration patterns per signal (mobile)
- **Share**: Post-round summary with reaction score

## Install as PWA

On mobile: open in Safari/Chrome → Add to Home Screen.

## Project Structure

```
src/
  app/           # Next.js app shell
  components/
    screens/     # Flow screens
    training/    # Immersive training UI
    ui/          # Reusable design system
  hooks/         # Training session hook
  lib/           # Signal engine, audio, scoring, storage
```
