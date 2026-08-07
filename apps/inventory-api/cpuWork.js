function calculatePrimes(limit) {

    const primes = [];

    for (let i = 2; i < limit; i++) {

        let isPrime = true;

        for (let j = 2; j * j <= i; j++) {

            if (i % j === 0) {
                isPrime = false;
                break;
            }

        }

        if (isPrime) {
            primes.push(i);
        }

    }

    return primes.length;
}

module.exports = {
    calculatePrimes
};
