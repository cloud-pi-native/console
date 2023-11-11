export type MonitorInfos = {
  /**
   * 0 = OK
   * 1 = WARNING
   * 2 = KO
   * 3 = UNKNOWN
   */
  status: 0 | 1 | 2 | 3
  message: string
  lastUpdate: Date
  nextUpdate: Date
}

export type MonitorResults = (MonitorInfos & { name: string })[]
