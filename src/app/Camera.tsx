import React, {
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  forwardRef,
} from "react";
import makeBlockiesUrl from "blockies-react-svg/dist/es/makeBlockiesUrl.mjs";

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
  const size = 8;
  const caseSensitive = true;
  const scale = 20;

  const [playing, toggle] = useAudio(props.url);
  const [playbeep, toggleBeep] = useAudio("focus-beep.mp3");
  const [released, setReleased] = useState(false);
  const [blinker, setBlinker] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [focussed, setFocussed] = useState(false);
  const [counter, setCounter] = useState(0);
  const [dotkey, setDotkey] = useState(Math.random());
  const [motive, setMotive] = useState({
      filter: "blur(20px) saturate(0)",
      background:
        "url(" +
        makeBlockiesUrl(
          "0x4200000000000000000000000000000000000066",
          size,
          caseSensitive,
          scale,
        ) +
        ") no-repeat center",
  });

  const trigger = () => {
    setReleased(true);
    setTimeout(() => {
      setReleased(false);
    }, 100);
  };

  const shut = () => {
    toggle();
    trigger();
  };

  const startBlink = () => {
    setBlinker(true);
    setDotkey(Math.random());
  };

  const showMotive = (address: string) => {
    setMotive({
      ...motive,
      filter: "blur(0) saturate(100%)",
      background:
        "url(" +
        makeBlockiesUrl(address, size, caseSensitive, scale) +
        ") no-repeat center",
    });
  };
  const setBlurred = () => {
    setMotive({
      ...motive,
      filter: "blur(5px) saturate(0)",
      background:
        "url(" +
        makeBlockiesUrl(
          "0x4200000000000000000000000000000000000066",
          size,
          caseSensitive,
          scale,
        ) +
        ") no-repeat center",
    });
  };
  const setFocus = () => {
    setMotive({
      ...motive,
      transition: "0s all linear",
      filter: "saturate(0)",
      background:
        "url(" +
        makeBlockiesUrl(
          "0x4200000000000000000000000000000000000066",
          size,
          caseSensitive,
          scale,
        ) +
        ") no-repeat center",
    });
    setFocussed(true);
    toggleBeep();
  };

  useImperativeHandle(ref, (cmd) => ({
    control(cmd, arg?) {
      switch (cmd) {
        case "releaseShutter":
          toggle();
          trigger();
          showMotive(arg.txto);
          break;
        case "blink":
          startBlink();
          break;
        case "disarm":
          setBlinker(false);
          setCounter(0);
          setInactive(true);
          break;
        case "setBlur":
          setBlurred();
          break;
        case "setFocus":
          setFocus();
          setFocussed(true);
          break;
        case "setCountdown":
          setCounter(arg.time * arg.blockTime);
          break;
        default:
          console.log("empty cmd");
      }
    },
  }));

  return (
    <div className="camerabody">
      <div style={motive} className="motive"></div>
      <div
        onClick={shut}
        className={released ? "shutter released" : "shutter"}
      ></div>
      <span
        key={dotkey}
        className={
          blinker ? "camera-control dot blinker" : "dot camera-control"
        }
      ></span>
      <span className="camera-control">
        <img
          className={inactive ? "self-timer inactive" : "self-timer"}
          src="self-timer-icon.svg"
          width="25px"
          height="25px"
        />
      </span>
      <span className="camera-control">
        {counter > 0 ? parseInt(counter) + "s" : ""}
      </span>
      <span className={focussed ? "camera-control" : "camera-control inactive"}>
        [AF]
      </span>
    </div>
  );
});

export default Camera;
