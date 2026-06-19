// 自动生成：游戏解包角色行走图索引
export const characterSprites: Record<string, string[]> = {
  // === 可婚角色 ===
  abigail: ['Characters_Abigail.png', 'Characters_Abigail_Beach.png', 'Characters_Abigail_Winter.png'],
  alex: ['Characters_Alex.png', 'Characters_Alex_Beach.png', 'Characters_Alex_Winter.png'],
  elliott: ['Characters_Elliott.png', 'Characters_Elliott_Beach.png', 'Characters_Elliott_Winter.png'],
  haley: ['Characters_Haley.png', 'Characters_Haley_Beach.png', 'Characters_Haley_Winter.png'],
  harvey: ['Characters_Harvey.png', 'Characters_Harvey_Beach.png', 'Characters_Harvey_Winter.png'],
  leah: ['Characters_Leah.png', 'Characters_Leah_Beach.png', 'Characters_Leah_Winter.png'],
  maru: ['Characters_Maru.png', 'Characters_Maru_Beach.png', 'Characters_Maru_Hospital.png', 'Characters_Maru_Winter.png'],
  penny: ['Characters_Penny.png', 'Characters_Penny_Beach.png', 'Characters_Penny_Winter.png'],
  sam: ['Characters_Sam.png', 'Characters_Sam_Beach.png', 'Characters_Sam_JojaMart.png', 'Characters_Sam_Winter.png'],
  sebastian: ['Characters_Sebastian.png', 'Characters_Sebastian_Beach.png', 'Characters_Sebastian_Winter.png'],
  shane: ['Characters_Shane.png', 'Characters_Shane_Beach.png', 'Characters_Shane_JojaMart.png', 'Characters_Shane_Winter.png'],
  emily: ['Characters_Emily.png', 'Characters_Emily_Beach.png', 'Characters_Emily_Winter.png'],
  // === 镇居民 ===
  caroline: ['Characters_Caroline.png', 'Characters_Caroline_Beach.png', 'Characters_Caroline_Winter.png'],
  pierre: ['Characters_Pierre.png', 'Characters_Pierre_Beach.png', 'Characters_Pierre_Winter.png'],
  lewis: ['Characters_Lewis.png', 'Characters_Lewis_Beach.png', 'Characters_Lewis_Winter.png'],
  marnie: ['Characters_Marnie.png', 'Characters_Marnie_Beach.png', 'Characters_Marnie_Winter.png'],
  robin: ['Characters_Robin.png', 'Characters_Robin_Beach.png', 'Characters_Robin_Winter.png'],
  linus: ['Characters_Linus.png', 'Characters_Linus_Winter.png'],
  pam: ['Characters_Pam.png', 'Characters_Pam_Beach.png', 'Characters_Pam_Winter.png'],
  jodi: ['Characters_Jodi.png', 'Characters_Jodi_Beach.png', 'Characters_Jodi_Winter.png'],
  kent: ['Characters_Kent.png', 'Characters_Kent_Winter.png'],
  vincent: ['Characters_Vincent.png', 'Characters_Vincent_Winter.png'],
  jas: ['Characters_Jas.png', 'Characters_Jas_Winter.png'],
  gus: ['Characters_Gus.png', 'Characters_Gus_Winter.png'],
  clint: ['Characters_Clint.png', 'Characters_Clint_Beach.png', 'Characters_Clint_Winter.png'],
  demetrius: ['Characters_Demetrius.png', 'Characters_Demetrius_Beach.png', 'Characters_Demetrius_Winter.png'],
  george: ['Characters_George.png', 'Characters_George_Winter.png'],
  evelyn: ['Characters_Evelyn.png', 'Characters_Evelyn_Winter.png'],
  willy: ['Characters_Willy.png', 'Characters_Willy_Winter.png'],
  // === 其他可社交 ===
  wizard: ['Characters_Wizard.png'],
  dwarf: ['Characters_Dwarf.png'],
  sandy: ['Characters_Sandy.png'],
  krobus: ['Characters_Krobus.png', 'Characters_Krobus_Trenchcoat.png'],
  leo: ['Characters_ParrotBoy.png', 'Characters_ParrotBoy_Winter.png'],
  parrotboy: ['Characters_ParrotBoy.png', 'Characters_ParrotBoy_Winter.png'],
  // === 其他人物 ===
  gunther: ['Characters_Gunther.png'],
  marlon: ['Characters_Marlon.png'],
  morris: ['Characters_Morris.png'],
  gil: [], // 游戏中没有行走图
  mrqi: ['Characters_MrQi.png'],
  professorsnail: [], // 游戏中没有行走图
  birdie: ['Characters_Birdie.png'],
  governor: ['Characters_Governor.png'],
  grandpa: ['Characters_Grandpa.png'],
  henchman: ['Characters_Henchman.png'],
  bouncer: ['Characters_Bouncer.png'],
  // === 动物/特殊角色 ===
  bear: ['Characters_Bear.png'],
  trashbear: ['Characters_TrashBear.png'],
  raccoon: ['Characters_raccoon.png'],
  junimo: ['Characters_Junimo.png'],
  crow: ['Characters_Crow.png'],
  // === 姜岛角色 ===
  fizz: ['Characters_Fizz.png'],
  safariguy: ['Characters_SafariGuy.png'],
  gourmand: ['Characters_Gourmand.png'],
  islandparrot: ['Characters_IslandParrot.png'],
  // === 其他 ===
  marcello: ['Characters_Marcello.png'],
  mariner: ['Characters_Mariner.png'],
  robot: ['Characters_robot.png'],
  // === 通用模板 ===
  baby: ['Characters_Baby.png', 'Characters_Baby_dark.png'],
  toddler: ['Characters_Toddler.png', 'Characters_Toddler_dark.png', 'Characters_Toddler_girl.png', 'Characters_Toddler_girl_dark.png'],
}

const BASE = './assets/maps'

export function getNpcSpriteUrls(npcName: string): string[] {
  const key = npcName.toLowerCase()
  const files = characterSprites[key]
  if (!files) return []
  return files.map(f => `${BASE}/${f}`)
}
