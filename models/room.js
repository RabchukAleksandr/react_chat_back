const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomID: {type: String},
    users: [{
        user: {type: String},
        socket: {type: String},
        imageUrl:{type: String}
    }
    ],
    massages: [{
        user:{type:String},
        massage:{type:String},
        imageUrl:{type:String},
        socket: {type: String},
        date: {type: String}
    }]



})

module.exports = mongoose.model('Room',RoomSchema)