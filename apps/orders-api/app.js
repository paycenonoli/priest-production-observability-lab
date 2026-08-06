const metrics = require("./metrics");
const express = require("express");

const app = express();

// Metrics middleware
app.use((req, res, next) => {

    const end = metrics.httpRequestDuration.startTimer();

    res.on("finish", () => {
        end({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode
        });
    });

    next();
});

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

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

app.listen(8081, () => {
    console.log("Orders API running on port 8081");
});
