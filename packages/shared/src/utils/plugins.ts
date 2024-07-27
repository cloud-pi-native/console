export enum MonitorStatus {
  OK = 'OK',
  WARNING = 'Dégradé',
  ERROR = 'En échec',
  UNKNOW = 'Inconnu',
}

export type MonitorInfos = {
  lastUpdateTimestamp: number
  interval: number
  message: string
  status: MonitorStatus
  cause?: any // should be deserved to admins only
}
export class Monitor {
  private intervalTime: number
  public monitorFn: (instance: any) => Promise<MonitorInfos>
  private intervalID: NodeJS.Timeout | undefined
  public lastStatus: MonitorInfos

  constructor(callback: (instance: Monitor) => Promise<MonitorInfos>, interval: number = 5 * 60 * 1000) {
    this.intervalTime = interval
    this.monitorFn = callback
    this.lastStatus = {
      interval: this.intervalTime,
      lastUpdateTimestamp: (new Date()).getTime(),
      message: 'En attente d\'une première vérification',
      status: MonitorStatus.UNKNOW,
      cause: 'App just started',
    }
  }

  async refresh() {
    if (this.intervalID) clearInterval(this.intervalID)
    this.intervalID = setInterval(() => this.monitorFn(this), this.intervalTime)
    return this.monitorFn(this)
  }
}
