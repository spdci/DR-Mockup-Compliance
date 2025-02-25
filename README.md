# CRVS-Mockup-Compliance

Mockoon API This is a mock application which performs API standards spec for an CRVS

# Prerequisites
You need to have Docker and Docker Compose up and running to be able to run this repo. Install Docker and Docker Compose here. After installing Docker, you may need to follow the steps here in order to execute Docker and Docker Compose without sudo.

# Run Mock API
Setup To run dockerized version of mocked API use shell script test_entrypoint.sh (requires docker and docker-compose). By default, API is available on port 3333. Dockerfile was created using mockoon-cli.

Changes in API definition To introduce changes in API definition it is necessary to change content of mockoon-ibr.json file. It can be done using mockoon application. Dockerized instance of application is not hot-reloaded, therefore it's necessary to restart server for changes to be applied.

# Run Tests
To Run the tests against ur specs Go to helpers and update the localhost url to point to your IBR URL. Go to test folder and use shell script test_entrypoint.sh to run the tests against your api once test is complete in result folder you should be able to see the testing results.
