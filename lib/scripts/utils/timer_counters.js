import { system } from "@minecraft/server";
function timerCounterCummon(time, onChange, onFinish) {
    let currentTime = 0;
    const counter = () => {
        if (currentTime >= time)
            return onFinish();
        currentTime++;
        onChange(currentTime);
        system.runTimeout(counter, 20);
    };
    counter();
}
function timerCounterInverse(time, onChange, onFinish) {
    let currentTime = time;
    const counter = () => {
        if (currentTime <= 0)
            return onFinish();
        onChange(currentTime);
        currentTime--;
        system.runTimeout(counter, 20);
    };
    counter();
}
export class TimerCouter {
    static Cummon = timerCounterCummon;
    static Inverse = timerCounterInverse;
}
//# sourceMappingURL=timer_counters.js.map