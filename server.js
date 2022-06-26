require("dotenv").config(); // a library enables accessing env vars from .env file
const socket = require("socket.io");
const mongoose = require("mongoose");
const _ = require("lodash");
//-----------------------------------//
const Document = require("./documents");

//---------------------------------------------------------------------//
//---------------------------------------------------------------------//

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((r) => console.log("Connected to the DB ..."))
  .catch((e) => console.error(e));

//---------------------------------------------------------------------//
const PORT = process.env.PORT || 3001;
const io = socket(PORT, {
  cors: {
    origin: "https://quadm-text-editor.herokuapp.com",
    methods: ["GET", "POST"],
  },
});

// let docs = [
//   {
//     _id: "eyrghkjdfas00000000000",
//     title: "Title 1",
//     quillContents: "",
//   },
//   {
//     _id: "eyrghkjdfas11111111111",
//     title: "Title 2",
//     quillContents: "",
//   },
//   {
//     _id: "eyrghkjdfas22222222222",
//     title: "Title 3",
//     quillContents: "",
//   },
//   {
//     _id: "eyrghkjdfas3333333333",
//     title: "Title 3",
//     quillContents: "",
//   },
//   {
//     _id: "eyrghkjdfas4444444444",
//     title: "Title 4",
//     quillContents: "",
//   },
//   {
//     _id: "eyrghkjdfas5555555555",
//     title: "Title 5",
//     quillContents: "",
//   },
// ];

io.on("connection", (stream) => {
  //-------------------------------------------------------------------//
  stream.on("get-all-docs", async () => {
    let data = await Document.find();
    data = data.map((d) => _.pick(d, ["_id", "title"]));
    stream.broadcast.emit("recieve-all-docs", data);
  });
  //-------------------------------------------------------------------//

  //-------------------------------------------------------------------//
  stream.on("create-new-doc", async () => {
    const doc = new Document({
      title: "Untitled Document",
      quillContents: " ",
    });
    doc.save();
    console.log("Saved document:", doc);
    stream.broadcast.emit("created-new-doc", doc);
    let data = await Document.find();
    data = data.map((d) => _.pick(d, ["_id", "title"]));
    stream.broadcast.emit("recieve-all-docs", data);
  });
  //-------------------------------------------------------------------//

  //-------------------------------------------------------------------//
  stream.on("delete-doc", async (docID) => {
    await Document.deleteOne({ _id: docID });
    let data = await Document.find();
    data = data.map((d) => _.pick(d, ["_id", "title"]));
    stream.broadcast.emit("recieve-all-docs", data);
  });
  //-------------------------------------------------------------------//

  //-------------------------------------------------------------------//
  stream.on("get-doc", async (docID) => {
    stream.join(docID);
    const doc = await Document.findOne({ _id: docID });
    console.log(doc);
    stream.emit("load-doc", doc);

    //-------------------------------------------------------------//
    stream.on("make-text-changes", ({ docID, quillContents, delta }) => {
      stream.broadcast.to(docID).emit("receive-text-changes", delta);
    });
    //-------------------------------------------------------------//
    stream.on("make-title-changes", (title) => {
      stream.broadcast.to(docID).emit("receive-title-changes", title);
    });
    //-------------------------------------------------------------//
    stream.on("save-doc", async ({ title, quillContents }) => {
      doc.title = title;
      doc.quillContents = quillContents;
      await doc.save();
      console.log("saved", doc);
      // stream.broadcast.to(docID).emit("saved-doc", "saved");
    });
  });
  //-------------------------------------------------------------------//
});
