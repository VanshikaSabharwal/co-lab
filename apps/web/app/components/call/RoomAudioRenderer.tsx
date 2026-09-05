"use client";

import { useEffect, useRef } from "react";
import { RoomEvent, Track, type RemoteTrack, type Room } from "livekit-client";

/**
 * Plays every remote audio track for the call, independent of what's on screen.
 *
 * Audio used to be attached only inside VideoTile, so a minimised call — or any
 * audio-only call, which renders no tiles at all — had nothing to attach to and
 * was silent. Mounting this once per room decouples hearing people from seeing
 * them.
 *
 * Local audio is deliberately excluded: attaching your own mic would echo it
 * straight back at you.
 */
export default function RoomAudioRenderer({ room }: { room: Room | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!room || !container) return;

    const elements = new Map<string, HTMLMediaElement>();

    const attach = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (track.sid && elements.has(track.sid)) return;
      const el = track.attach();
      // Autoplay is allowed here because a call always starts from a user
      // gesture (clicking call or accept).
      el.autoplay = true;
      container.appendChild(el);
      if (track.sid) elements.set(track.sid, el);
    };

    const detach = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;
      track.detach().forEach((el) => el.remove());
      if (track.sid) elements.delete(track.sid);
    };

    // Anyone already publishing before this mounted — e.g. the callee joining
    // a call that's been running.
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.track) attach(pub.track as RemoteTrack);
      });
    });

    room.on(RoomEvent.TrackSubscribed, attach);
    room.on(RoomEvent.TrackUnsubscribed, detach);

    return () => {
      room.off(RoomEvent.TrackSubscribed, attach);
      room.off(RoomEvent.TrackUnsubscribed, detach);
      elements.forEach((el) => el.remove());
      elements.clear();
    };
  }, [room]);

  return <div ref={containerRef} className="hidden" aria-hidden />;
}
