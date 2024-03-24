
import bodyParser from 'body-parser'
import axios from 'axios'
import io from 'socket.io-client'

import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'

import { PrismaClient } from '@prisma/client'
import { expressX } from '@jcbuisson/express-x'
import expressXClient from '@jcbuisson/express-x-client'




describe('ExpressX API server-side', () => {

   const prisma = new PrismaClient()
   const app = expressX({})

   before(async () => {
      app.createService('User', prisma.User)
      app.createService('Post', prisma.Post)

      await app.service('User').deleteMany()
      await app.service('Post').deleteMany()
   })

   after(async () => {
      await prisma.$disconnect()
   })

   it("can delete all users", async () => {
      const res = await app.service('User').deleteMany()
      assert(res.count >= 0)
   })

   it("can create a user", async () => {
      const user = await app.service('User').create({
         data: {
            name: "chris",
            email: 'chris@mail.fr'
         },
      })
      assert(user.name === 'chris')
   })

   it("can find a user by name", async () => {
      const users = await app.service('User').findMany({
         where: {
            name: {
               startsWith: "ch"
            }
         }
      })
      assert(users.length > 0)
   })

   it("can find a unique user by email", async () => {
      const chris = await app.service('User').findUnique({
         where: {
            email: "chris@mail.fr"
         }
      })
      assert(chris.name === 'chris')
   })

})


describe('ExpressX websocket client API', () => {

   const prisma = new PrismaClient()
   const app = expressX(prisma, {})

   let clientApp, socket

   before(async () => {
      app.createService('User', prisma.User)
      app.createService('Post', prisma.Post)
   
      await app.service('User').deleteMany()
      await app.service('Post').deleteMany()

      await new Promise((resolve) => {
         app.httpServer.listen(8008, () => {
            // console.log(`App listening at http://localhost:8008`)
            resolve()
         })
      })
      socket = io('http://localhost:8008', { transports: ["websocket"] })
      clientApp = expressXClient(socket, { debug: false })
   })

   after(async () => {
      await socket.close()
      app.httpServer.close()
      await prisma.$disconnect()
   })

   it("detect missing service as an exception", async () => {
      try {
         await clientApp.service('UUser').create({
            data: {
               name: "chris",
               email: 'chris@mail.fr'
            },
         })
      } catch(err) {
         assert(err.code === 'missing-service')
      }
   })

   it("detect missing method as an exception", async () => {
      try {
         await clientApp.service('User').cccccreate({
            data: {
               name: "chris",
               email: 'chris@mail.fr'
            },
         })
      } catch(err) {
         assert(err.code === 'missing-method')
      }
   })

   it("can create a user", async () => {
      const user = await clientApp.service('User').create({
         data: {
            name: "chris",
            email: 'chris@mail.fr'
         },
      })
      assert(user.name === 'chris')
   })
})
