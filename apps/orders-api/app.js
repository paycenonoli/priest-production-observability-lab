const express = require("express");

const app = express();

app.get("/orders", (req, res) => {
    res.json([
        {
            id: 1,
            item: "Laptop",
            quantity: 2
        },
        {
            id: 2,
            item: "Keyboard",
            quantity: 1
        }
    ]);
});

app.get("/health", (req, res) => {
    res.send("OK");
});

app.listen(8081, () => {
    console.log("Orders API running on port 8081");
});
