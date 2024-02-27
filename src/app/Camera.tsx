import React, {
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  forwardRef,
} from "react";

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
  const [released, setReleased] = useState(false);

  const trigger = () => {
    setReleased(!released);
    setTimeout(() => {
      setReleased(released);
    }, 100);
  };

  useImperativeHandle(ref, () => ({
    releaseShutter() {
      toggle();
      trigger();
    },
  }));

  return <div className={released ? "shutter released" : "shutter"}></div>;
});

export default Camera;
