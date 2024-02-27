import React, { useImperativeHandle, useState, useEffect, useRef, forwardRef } from "react";

const useAudio = (url) => {
  const [audio] = useState(new Audio(url));
  const [playing, setPlaying] = useState(false);

  const toggle = () => setPlaying(!playing);

  useEffect(() => {
    playing ? audio.play() : audio.pause();
  }, [playing]);

  useEffect(() => {
    audio.addEventListener("ended", () => setPlaying(false));
    return () => {
      audio.removeEventListener("ended", () => setPlaying(false));
    };
  }, []);

  return [playing, toggle];
};

const Camera = forwardRef((props, ref) => {
  const [playing, toggle] = useAudio(props.url);
  useImperativeHandle(ref, () => ({
    releaseShutter() {
      toggle();
    },
  }));

  return <div className="shutter"></div>;
});

export default Camera;
