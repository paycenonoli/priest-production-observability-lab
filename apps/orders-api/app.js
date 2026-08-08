const metrics = require("./metrics");
const express = require("express");
const { createClient } = require("redis");

const app = express();

const redisClient = createClient({
    url: "redis://redis:6379"
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
});

async function start() {

    await redisClient.connect();

    console.log("Connected to Redis");

    // Seed orders into Redis if they don't already exist
    const existingOrders = await redisClient.get("orders");

    if (!existingOrders) {

        const orders = [
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
        ];

        await redisClient.set("orders", JSON.stringify(orders));

        console.log("Orders seeded into Redis");

    }

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

    // Orders API
    app.get("/orders", async (req, res) => {

        try {

            const data = await redisClient.get("orders");

            const orders = JSON.parse(data || "[]");

            res.json(orders);

        } catch (err) {

            console.error("Failed to retrieve orders from Redis", err);

            res.status(500).json({
                error: "Unable to retrieve orders"
            });

        }

    });

    // Health
    app.get("/health", (req, res) => {

        res.send("OK");

    });

    // Metrics
    app.get("/metrics", async (req, res) => {

        res.set("Content-Type", metrics.register.contentType);

        res.end(await metrics.register.metrics());

    });

    app.listen(8081, () => {

        console.log("Orders API running on port 8081");

    });

}

start().catch((err) => {

    console.error("Failed to start Orders API", err);

    process.exit(1);

});
