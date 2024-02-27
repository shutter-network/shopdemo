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
  const [blinker, setBlinker] = useState(false);
  const [counter, setCounter] = useState(0);
  const [dotkey, setDotkey] = useState(Math.random());

  const trigger = () => {
    setReleased(true);
    setTimeout(() => {
      setReleased(false);
    }, 100);
  };

  const startBlink = () => {
    setBlinker(true);
    setDotkey(Math.random());
  };

  useImperativeHandle(ref, (cmd) => ({
    control(cmd, arg?) {
      switch (cmd) {
        case "releaseShutter":
          toggle();
          trigger();
          break;
        case "blink":
          startBlink();
          break;
        case "disarm":
          setBlinker(false);
          setCounter(0);
          break;
        case "setCountdown":
          setCounter(arg.time * arg.blockTime);
          console.log("arg", arg);
          break;
        default:
          console.log("empty cmd");
      }
    },
  }));

  return (
    <div>
      <div className={released ? "shutter released" : "shutter"}></div>
      <span
        key={dotkey}
        className={
          blinker ? "camera-control dot blinker" : "dot camera-control"
        }
      ></span>
      <span className="camera-control">
        <img
          className={released ? "self-timer inactive" : "self-timer"}
          src="self-timer-icon.svg"
          width="25px"
          height="25px"
        />
      </span>
      <span className="camera-control">
        {counter > 0 ? parseInt(counter) + "s" : ""}
      </span>
    </div>
  );
});

export default Camera;
