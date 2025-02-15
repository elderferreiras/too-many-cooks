const path = require('path')

const geckos = require('@geckos.io/server').default
const { Scene } = require('phaser')

const { Settings, SpriteType } = require('./enums')

const SpriteItems = require('./sprites/items')
const {
  Bun,
  BurgerBeef,
  BurgerBeefLettuce,
  BurgerBeefTomato,
  BurgerBeefTomatoLettuce,
  BurgerLettuce,
  BurgerTomato,
  BurgerTomatoLettuce,
  Cow,
  Lettuce,
  Tomato,
} = require('./sprites/items')
const Player = require('./sprites/player')


const boxMap = {
  [SpriteType.COW_BOX]: Cow,
  [SpriteType.BUN_BOX]: Bun,
  [SpriteType.LETTUCE_BOX]: Lettuce,
  [SpriteType.TOMATO_BOX]: Tomato,
}

class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.entityID = 1
  }

  init() {
    this.io = geckos({
      enableAudio: Settings.ENABLE_AUDIO,
      enableVideo: Settings.ENABLE_VIDEO,
      iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
    })
    this.io.addServer(this.game.server)
  }

  getID() {
    return this.entityID++
  }

  prepareToSync(e) {
    const x = Math.round(e.x).toString(Settings.RADIX)
    const y = Math.round(e.y).toString(Settings.RADIX)
    const j = e.body.velocity.y < Settings.SHOW_ROCKET_VY ? 1:0 // is jumping
    return `${e.type},${e.entityID},${x},${y},${e.flipX ? 1:0},${e.flipY ? 1:0},${e.angle},${e.anim ? 1:0},${j},${e.item ? 1:0},`
  }

  /**
   * Gets a mapping of channel ID to entity ID to help map audio/video streams to the correct player
   */
  getChannelEntityMap() {
    const channelEntityMap = {}
    this.io.connectionsManager.getConnections().forEach(conn => {
      channelEntityMap[conn.channel.id] = conn.channel.entityID
    })
    return channelEntityMap
  }

  getState() {
    let state = ''
    this.boxesGroup.children.iterate((box) => {
      state += this.prepareToSync(box)
    })
    this.playersGroup.children.iterate((player) => {
      state += this.prepareToSync(player)
    })
    this.itemsGroup.children.iterate((item) => {
      state += this.prepareToSync(item)
    })
    this.ingredientsGroup.children.iterate((item) => {
      state += this.prepareToSync(item)
    })
    return state
  }

  preload() {
    this.load.image('platform', path.join(__dirname, '../../dist/assets/platform.png'))
    this.load.tilemapTiledJSON('map', path.join(__dirname, '../../dist/assets/level-1.json'))
  }

  create() {
    this.physics.world.setBounds(0, 0, Settings.LEVEL_WIDTH, Settings.LEVEL_HEIGHT)

    this.boxesGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true,
      collideWorldBounds: true,
    })

    this.itemsGroup = this.physics.add.group({
      angularVelocity: 0,
      allowGravity: false,
      immovable: true,
    })

    this.ingredientsGroup = this.physics.add.group({
      allowGravity: true,
      bounceY: 0.2,
      immovable: false,
      collideWorldBounds: true,
    })

    this.playersGroup = this.physics.add.group({
      bounceY: 0.2,
      collideWorldBounds: true,
    })

    const levelMap = this.make.tilemap({ key: 'map' })
    const tiles = levelMap.addTilesetImage('platform', 'platform', Settings.TILE_WIDTH, Settings.TILE_HEIGHT)

    const grabItemFromBlock = (sprite, box) => {
      if (sprite.type !== SpriteType.PLAYER) {
        return
      }

      if (!sprite.item && sprite.move.space && sprite.body.touching.down && box.body.touching.up) {
        sprite.move.space = false
        const item = new boxMap[box.type](this, this.getID())
        item.positionOnPlayer(sprite)
        sprite.item = item
        this.itemsGroup.add(item)
      }
    }

    const pickupIngredient = (sprite, ingredient) => {
      if (sprite.type !== SpriteType.PLAYER) {
        return
      }

      if (sprite.item && sprite.move.x) {
        sprite.move.x = false
        const item = sprite.item
        let BurgerClass
        // TODO: Refactor this ugly conditional
        if (item.type < SpriteType.BUN && ingredient.type > SpriteType.COW) {
          if (item.type === SpriteType.COW && ingredient.type === SpriteType.BUN) {
            BurgerClass = BurgerBeef
          } else if (item.type === SpriteType.COW && ingredient.type === SpriteType.BURGER_LETTUCE) {
            BurgerClass = BurgerBeefLettuce
          } else if (item.type === SpriteType.COW && ingredient.type === SpriteType.BURGER_TOMATO) {
            BurgerClass = BurgerBeefTomato
          } else if (item.type === SpriteType.COW && ingredient.type === SpriteType.BURGER_TOMATO_LETTUCE) {
            BurgerClass = BurgerBeefTomatoLettuce
          } else if (item.type === SpriteType.LETTUCE && ingredient.type === SpriteType.BUN) {
            BurgerClass = BurgerLettuce
          } else if (item.type === SpriteType.LETTUCE && ingredient.type === SpriteType.BURGER_BEEF) {
            BurgerClass = BurgerBeefLettuce
          } else if (item.type === SpriteType.LETTUCE && ingredient.type === SpriteType.BURGER_TOMATO) {
            BurgerClass = BurgerTomatoLettuce
          } else if (item.type === SpriteType.LETTUCE && ingredient.type === SpriteType.BURGER_BEEF_TOMATO) {
            BurgerClass = BurgerBeefTomatoLettuce
          } else if (item.type === SpriteType.TOMATO && ingredient.type === SpriteType.BUN) {
            BurgerClass = BurgerTomato
          } else if (item.type === SpriteType.TOMATO && ingredient.type === SpriteType.BURGER_BEEF) {
            BurgerClass = BurgerBeefTomato
          } else if (item.type === SpriteType.TOMATO && ingredient.type === SpriteType.BURGER_LETTUCE) {
            BurgerClass = BurgerTomatoLettuce
          } else if (item.type === SpriteType.TOMATO && ingredient.type === SpriteType.BURGER_BEEF_LETTUCE) {
            BurgerClass = BurgerBeefTomatoLettuce
          }
        }

        if (BurgerClass) {
          const newItem = new BurgerClass(this, this.getID())
          newItem.positionOnPlayer(sprite)
          this.itemsGroup.add(newItem)
          sprite.item = newItem

          this.io.room().emit('removePlayer', item.entityID)
          this.io.room().emit('removePlayer', ingredient.entityID)

          // Clean up merged items
          item.removeEvents()
          ingredient.removeEvents()

          this.itemsGroup.remove(item)
          this.ingredientsGroup.remove(ingredient)

          item.destroy()
          ingredient.destroy()
        }
        return
      }

      if (!sprite.item && sprite.move.space) {
        sprite.move.space = false

        // Remove it from the ingredient physics group
        this.ingredientsGroup.remove(ingredient)
        // Add it to the item physics group which has different behavior
        this.itemsGroup.add(ingredient)
        ingredient.positionOnPlayer(sprite)
        ingredient.setFlipY(false)

        sprite.item = ingredient
        return
      }
    }

    // Add collisions to tile map
    const worldLayer = levelMap.createDynamicLayer('platform', tiles).setCollision(1)

    // Add ingredient boxes
    levelMap.getObjectLayer('boxes')['objects'].forEach(box => {
      this.boxesGroup.add(new SpriteItems[box.name](this, this.getID(), box.x, box.y))
    })

    this.physics.add.collider(this.ingredientsGroup, worldLayer)
    this.physics.add.collider(this.playersGroup, worldLayer)
    this.physics.add.collider(this.ingredientsGroup, this.boxesGroup)
    this.physics.add.collider(this.playersGroup, this.boxesGroup, grabItemFromBlock, null, this)
    this.physics.add.overlap(this.playersGroup, this.ingredientsGroup, pickupIngredient, null, this)

    this.io.onConnection(async (channel) => {
      channel.onDisconnect(() => {
        console.log('Disconnect user ' + channel.id)
        let disconnectedPlayer = null
        this.playersGroup.children.each((player) => {
          if (player.entityID === channel.entityID) {
            disconnectedPlayer = player
          }
        })
        if (disconnectedPlayer) {
          this.playersGroup.remove(disconnectedPlayer)
          disconnectedPlayer.removeEvents()
          disconnectedPlayer.destroy()
        }
        channel.room.emit('removePlayer', channel.entityID)
      })

      channel.on('getID', () => {
        channel.entityID = this.getID()
        channel.emit('getID', channel.entityID.toString(Settings.RADIX))

        // Notify everyone when someone joins the game so we can add their stream
        channel.broadcast.emit('joinGame', `${channel.id},${channel.entityID}`, { reliable: true })
      })

      channel.on('playerMove', (data) => {
        this.playersGroup.children.iterate((player) => {
          if (player.entityID === channel.entityID) {
            player.setMove(data)
          }
        })
      })

      channel.on('addPlayer', () => {
        this.playersGroup.add(
          new Player(
            this,
            channel.entityID,
            Phaser.Math.RND.integerInRange(0, Settings.LEVEL_WIDTH),
          )
        )
      })

      // Add a small delay to avoid a race condition with the ready event.
      // Without the delay, the ready event may be emitted before the client
      // has connected.
      await new Promise(resolve => setTimeout(resolve, 500))
      channel.emit('ready')
    })
  }

  update() {
    let updates = ''

    const syncSpriteData = (sprite) => {
      if (sprite.needsSync()) {
        updates += this.prepareToSync(sprite)
      }
      sprite.postUpdate()
    }

    this.boxesGroup.children.iterate(syncSpriteData)
    this.playersGroup.children.iterate(syncSpriteData)
    this.itemsGroup.children.iterate(syncSpriteData)
    this.ingredientsGroup.children.iterate(syncSpriteData)

    if (updates.length > 0) {
      this.io.room().emit('updateEntities', [updates])
    }
  }
}

module.exports = GameScene
