import { system } from "@minecraft/server";
export class OnTickTimerEvent {
    constructor() { }
    currentTime;
    cancelTimer;
}
export class TimerManager {
    constructor() { }
    static SetTimer(time, onTick, end) {
        let currentTime = 0; // MONITORA O TEMPO
        let canceled = false; // CANSELA O CONTADOR
        const cancelTimer = () => canceled = true; // CANSELADOR
        const timer = () => {
            if (canceled)
                return; // INTERROMPE SE CANCELAR
            if (currentTime >= time)
                return end(); // EXECUTA SE O TEMPO ACABAR
            currentTime++; // ATUALIZA O TEMPO
            onTick({ cancelTimer, currentTime }); // EXECUTA DURANTE O TEMPO
            if (!canceled)
                system.runTimeout(timer, 20); // PROXIMO TEMPO
        };
        timer(); // INICIA O TEMPORIZADOR
    }
}
//# sourceMappingURL=timer_counters.js.map