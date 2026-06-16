/** 邮件附件 */
export interface MailAttachment {
  itemId: string
  count: number
}

/** 自定义邮件数据 */
export interface GameMail {
  id: string
  title: string
  text: string
  attachments: MailAttachment[]
  gold: number
  recipe: string
  forceOpen: boolean
  trigger: string
  created: string
}
