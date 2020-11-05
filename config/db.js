const mongoose = require('mongoose')
// const config = require('config')
// const db = config.get()

mongoose.set('useFindAndModify', false);

const connectDB = async () => {
    try {
        mongoose.connect("mongodb+srv://gerderon:gerderon14@cluster0.ztl2d.mongodb.net/newdb?retryWrites=true&w=majority",
            {
                useNewUrlParser: true,
                useUnifiedTopology: true
            })
        console.log("dbconected")
    } catch (e) {
        console.error(e.massage)
        process.exit(1)
    }
}

module.exports = connectDB