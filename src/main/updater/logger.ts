import log from 'electron-log'

log.transports.file.level = 'info'
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

export const logger = log
export default log