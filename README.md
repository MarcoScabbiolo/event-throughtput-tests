The same message consumer written in some languages to measure the differences in their throughputs and to serve as an example of how to use the language itself.

In the root dir you can find a folder for each language, currently:

- `rust`
- `js`
- `kotlin (spring)`
- `kotlin (quarkus)`

Architecture and "complexity" can be exaggerated to make the most out of the language as long as performance is optimal and (legi/scala/maintaina)bility is improved. Esoteric factors like number of lines are considered irrelevant.

## System

A kafka topic is consumed by a single runtime of a specific language. For each message the payload is retrieved and an endpoint is called  with it via HTTP. The response from the endpoint is then stored saving some data from it into a MongoDB database.

## Install

Make sure you have installed the following:
- `docker`
- `docker-compose`
- `node 18+`
- `yarn`
- `rust` + `cargo`
- `java 17`
- `quarkus`

Many actions are done through the `scripts`. Run `yarn` on that folder to be able to use the repo.

## Usage

The main script is `run.js` which takes as arguments:
- Number of messages to produce into the topic
- [Optional] Language/Solution "id" (folder name: `js|rust`) to run. If not passed all will be ran.

Some languages will have their magnitudes (message count and time) changed to avoid the whole run from taking too long. See the languages declaration in `scripts/run.js` for more details.

A high message count might crash the endpoint consumed for each message.

## Under the hood

You can follow the breadcrumps from the `run` script to understand everything that's going on as it does everything needed to run the "performance tests".

The `docker-compose` file has a ton of info and even monitoring tools for kafka and mongodb.

Any contribution, critique, comment, feedback, etc. is more than welcome.

## Nice to have

- All languages run their own topic with 10 partitions and 10 consumers. It's ok that the conditions are the same for all, but the number 10 is harcoded everywhere, it could be an argument of `run`.
- Avoid the arbitrary timeouts in `run` and await proper data as different hardwarde conditions may make the project unusable.
- Some types and linting in those JS scripts if they're going to get bigger.
- Might be worth checking out the different variants for kotlin (Quarkus, Micronaut, Spring Native, Reactive/Async/WebFlux Spring)
- GOlang. Probably wont do it myself, I don't like the language at all.
- Write the endpoint in something better than JS. Might also have to check the network I/O limit in therse scenarios.
