import { system } from "@minecraft/server"

export class OnTickTimerEvent {
  private constructor() { }
  readonly currentTime: number
  readonly cancelTimer: () => void
}

export class TimerManager { // GERENCIADOR DE TEMPORIZADORES
  private constructor() { }

  static SetTimer(time: number, onTick: (arg0: OnTickTimerEvent) => void, end: () => void) { // DEFINIR TEMPORIZADOR
    let currentTime: number = 0 // MONITORA O TEMPO
    let canceled: boolean = false // CANSELA O CONTADOR
    const cancelTimer = () => canceled = true // CANSELADOR
    const timer = () => { // TEMPORIZADOR
      if (canceled) return // INTERROMPE SE CANCELAR
      if (currentTime >= time) return end() // EXECUTA SE O TEMPO ACABAR
      currentTime++ // ATUALIZA O TEMPO
      onTick({ cancelTimer, currentTime }) // EXECUTA DURANTE O TEMPO
      if (!canceled) system.runTimeout(timer, 20) // PROXIMO TEMPO
    }
    timer() // INICIA O TEMPORIZADOR
  }
}