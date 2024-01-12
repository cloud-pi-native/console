export enum MonitorStatus {
  OK = 'OK',
  WARNING = 'Dégradé',
  ERROR = 'En échec',
  UNKNOW = 'Inconnu',
}

export type MonitorInfos = {
  lastUpdateTimestamp: number,
  interval: number,
  message: string,
  status: MonitorStatus,
}
export class Monitor {
  private intervalTime: number
  public monitorFn: (instance: any) => Promise<MonitorInfos>
  private monitorInterval: NodeJS.Timeout | undefined
  public lastStatus: MonitorInfos

  constructor (callback: (instance: Monitor) => Promise<MonitorInfos>, interval: number = 5 * 60 * 1000) {
    this.intervalTime = interval
    this.monitorFn = callback
    this.lastStatus = {
      interval: this.intervalTime,
      lastUpdateTimestamp: (new Date()).getTime(),
      message: 'En attente de démarrage',
      status: MonitorStatus.UNKNOW,
    }
  }

  refresh = async () => {
    // TODO détruire l'ancien interval
    this.monitorInterval = setInterval(this.monitorFn, this.intervalTime)
    return this.monitorFn(this)
  }
}
