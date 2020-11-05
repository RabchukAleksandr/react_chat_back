const express = require('express');
const AWS = require('aws-sdk')
const multer = require("multer")

require('dotenv/config')
const {v4: uuid_v4} = require('uuid');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const connectDB = require('./config/db')
const cors = require('cors')

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    region: process.env.S3_REGION
})

const storage = multer.memoryStorage({

    destination: function (req, file, callback) {
        callback(null, '')
    }
})
const upload = multer({storage}).single('image')
const Room = require('./models/room')

app.post('/upload', upload, (req, res) => {

    let myFile = req.file.originalname.split(".")
    const fileType = myFile[myFile.length - 1]


    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `images/${uuid_v4()}.${fileType}`,
        Body: req.file.buffer

    }

    s3.upload(params, async (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        res.status(200).send(data)


    });

})

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}))

io.on('connection', (socket) => {
    socket.on('ROOM:JOIN', async ({roomID, user, imageUrl}) => {
        socket.join(roomID)

        const source = await Room.findOne({roomID})

        if (!source) {
            await Room.create({
                roomID,
                users: {
                    user,
                    socket: socket.id,
                    imageUrl
                },
                massages: []

            })
        } else {
            await Room.updateOne({roomID}, {
                $push: {
                    users: {
                        user,
                        socket: socket.id,
                        imageUrl
                    }
                }
            }, {upsert: true})
        }
        const db = await Room.find({roomID})

        const users = []
        db[0].users.forEach((u) => {
            users.push({
                user: u.user,
                socket: u.socket,
                imageUrl: u.imageUrl
            })
        })

        socket.to(roomID).broadcast.emit('ROOM:JOINED', users)
        socket.emit('ROOM:JOINED', users)


    })
    socket.on('ROOM:NEW_MASSAGE', async ({roomID, user, massage, imageUrl, date}) => {

        const source = await Room.findOne({roomID})
        if (source) {
            await Room.updateOne({roomID}, {
                $push: {
                    massages: {
                        user,
                        massage,
                        imageUrl,
                        socket: socket.id,
                        date
                    }
                }
            }, {upsert: true})
        }


        const db = await Room.find({roomID})

        const massages = []

        db[0].massages.forEach((u) => {
            massages.push({
                user: u.user,
                massage: u.massage,
                imageUrl: u.imageUrl,
                socket: u.socket,
                date: u.date
            })
        })


        socket.to(roomID).broadcast.emit('ROOM:MASSAGE', massages)
        socket.emit('ROOM:MASSAGE', massages)

    })
    socket.on('disconnect', async () => {

        const deleteUser = await Room.findOneAndUpdate({"users.socket": socket.id}, {$pull: {users: {socket: socket.id}}})

        const usersUpdated = await Room.findOne({roomID: deleteUser.roomID})

        const users = []
        usersUpdated.users.forEach((u) => {
            users.push({
                user: u.user,
                socket: u.socket,
                imageUrl: u.imageUrl
            })
        })
        socket.to(usersUpdated.roomID).broadcast.emit('ROOM:LEFT', users)
        socket.emit('ROOM:LEFT', users)

    })

})

app.get('/rooms/:id', async (req, res) => {
    const {id: roomID} = req.params;


    const db = await Room.find({roomID})

    const users = []
    const massages = []
    db[0].users.forEach((u) => {
        users.push({
            user: u.user,
            socket: u.socket,
            imageUrl: u.imageUrl,

        })
    })
    if (db[0].massages) {
        db[0].massages.forEach((u) => {
            massages.push({
                user: u.user,
                massage: u.massage,
                imageUrl: u.imageUrl,
                socket: u.socket,
                date: u.date
            })
        })
    }

    const obj = db ? {
        users,
        massages
    } : {users: [], massages: []}

    res.json(obj);
});

connectDB();
const port = process.env.port || 8080
server.listen(port, (err) => {
    if (err) {
        throw Error(err)
    }
    console.log("Server started")
})