const radians = Math.PI / 180;
const smoothingTime = 52;
const sensorTimeout = 3000;

function screenAngle() {
  return (screen.orientation?.angle ?? window.orientation ?? 0) * radians;
}

export function sensorQuaternion(angles, angle, axes) {
  const [alpha, beta, gamma] = angles;
  axes.euler.set(beta * radians, alpha * radians, -gamma * radians, 'YXZ');
  return axes.device.setFromEuler(axes.euler).multiply(axes.cameraAxis)
    .multiply(axes.screenRotation.setFromAxisAngle(axes.screenAxis, -angle));
}

export function createOrientationControl({loadEngine, getBasis, onFrame, onState, canStart}) {
  let state = 'off';
  let controller, timer, frame, basis, axes, sample, sensorOrigin, target, current, inverse;
  let previousFrame = 0;

  function setState(next, message = '') {
    state = next;
    onState(next, message);
  }

  function stop(message) {
    controller?.abort();
    controller = undefined;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
    sample = undefined;
    sensorOrigin = undefined;
    setState('off', message);
  }

  function render(time) {
    frame = 0;
    const elapsed = previousFrame ? Math.min(time - previousFrame, 100) : 16.7;
    previousFrame = time;
    if (current.angleTo(target) < .00065) {
      current.copy(target);
    } else {
      current.slerp(target, 1 - Math.exp(-elapsed / smoothingTime));
      frame = requestAnimationFrame(render);
    }
    onFrame(current);
  }

  function updateTarget() {
    if (!sample || state !== 'active') return;
    const device = sensorQuaternion(sample, screenAngle(), axes);
    target.copy(basis).multiply(inverse.copy(sensorOrigin).invert()).multiply(device);
    if (!frame && current.angleTo(target) >= .00065) {
      previousFrame = 0;
      frame = requestAnimationFrame(render);
    }
  }

  function onOrientation(event) {
    if (![event.alpha, event.beta, event.gamma].every(Number.isFinite)) return;
    sample = [event.alpha, event.beta, event.gamma];
    if (state === 'pending') {
      clearTimeout(timer);
      sensorOrigin = sensorQuaternion(sample, screenAngle(), axes).clone();
      setState('active');
      onFrame(current);
    }
    updateTarget();
  }

  async function start() {
    if (state !== 'off' || !canStart()) return;
    if (!window.isSecureContext) {
      stop('Hãy mở website qua HTTPS để dùng cảm biến.');
      return;
    }
    const Orientation = window.DeviceOrientationEvent;
    if (!Orientation) {
      stop('Trình duyệt này không hỗ trợ cảm biến hướng.');
      return;
    }

    setState('pending', 'Đang chờ cảm biến hướng…');
    const attempt = new AbortController();
    controller = attempt;
    try {
      if (typeof Orientation.requestPermission === 'function') {
        const permission = await Orientation.requestPermission();
        if (attempt.signal.aborted) return;
        if (permission !== 'granted') {
          stop('Quyền cảm biến chưa được cấp. Bạn vẫn có thể kéo màn hình để nhìn quanh.');
          return;
        }
      }
      const {Euler, Quaternion, Vector3} = await loadEngine();
      if (attempt.signal.aborted) return;
      axes = {
        euler: new Euler(), device: new Quaternion(), screenRotation: new Quaternion(),
        cameraAxis: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
        screenAxis: new Vector3(0, 0, 1),
      };
      basis = getBasis(Quaternion, Euler);
      target = basis.clone();
      current = basis.clone();
      inverse = new Quaternion();
      const options = {signal: attempt.signal};
      window.addEventListener('deviceorientation', onOrientation, {...options, passive: true});
      screen.orientation?.addEventListener('change', updateTarget, options);
      window.addEventListener('orientationchange', updateTarget, options);
      window.addEventListener('pagehide', () => stop(), options);
      timer = setTimeout(() => stop('Không nhận được tín hiệu cảm biến. Bạn vẫn có thể kéo màn hình để nhìn quanh.'), sensorTimeout);
    } catch {
      if (!attempt.signal.aborted) stop('Không mở được chế độ VR. Bạn vẫn có thể kéo màn hình để nhìn quanh.');
    }
  }

  function recenter() {
    if (state !== 'active') return;
    sensorOrigin.copy(sensorQuaternion(sample, screenAngle(), axes));
    updateTarget();
  }

  return {start, stop, recenter, get engaged() { return state !== 'off'; }};
}
