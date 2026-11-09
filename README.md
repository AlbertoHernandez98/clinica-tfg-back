<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

The application uses the `test` MariaDB database configured in `src/app.module.ts`.
For databases created before user IDs were generated automatically, apply
`migrations/001-persona-auto-increment.sql` to the configured database before
creating users. The migration preserves existing identifiers, including zero.
Apply `migrations/002-persona-email.sql` to add email addresses; existing
users retain an empty email until one is entered.

Appointment scheduling uses `migrations/003-disponibilidad.sql`. Back up the
database and review the existing `cita` schema before applying it. Existing
appointments retain their dates and times, but their duration is unknown and
must be filled in manually; until then, new appointments for the affected
doctor are conservatively blocked. The migration removes the unique service
index so multiple appointments may use the same service.

The scheduling and person endpoints require a bearer token from `POST
/auth/login` (body: `username` containing the DNI and `password`). Users must
sign in again after deployment. Set `JWT_SECRET` to a long, unpredictable
secret shared by the backend instances; without it, a random temporary key is
generated on startup and existing sessions are invalidated on restart. The
legacy database still stores passwords in plaintext, so this setup is not
suitable for production without a separate password-hashing migration and HTTPS.
Administrators may manage all roles. Doctors may create and edit patients and
edit their own profile, but cannot delete users. Receptionists may create,
edit and delete doctors and patients. Patients cannot administer users and
can only retrieve their own profile. Non-administrators cannot change their
own role or password through the user-editing endpoint.
Doctors and receptionists may manage only their own holidays; receptionists'
holidays do not affect doctors' appointment availability.
Doctors may modify or delete only their own appointments and cannot reassign
them to another doctor. Administrators and receptionists can manage all doctors'
appointments.
`GET /citas/mi-agenda?inicio=YYYY-MM-DD` returns seven days of appointments
and holidays for the authenticated doctor only, including appointments that
overlap the start of the period and a count of appointments without a date.
`GET /citas/mis-citas` returns only appointments assigned to the authenticated
patient (role 4); it does not accept a patient identifier from the client.
Appointment creation, modification and availability checks enforce clinic hours:
Monday, Wednesday and Friday 16:00–20:00; Tuesday and Thursday 09:30–13:30;
weekends closed. An appointment must finish no later than closing time.
Vacation periods may cross a weekend, but only affect weekdays and must include
at least one weekday.
`POST /citas/huecos` accepts `fecha`, `idMedico`, `duracion` and an optional
`idCita` being edited. It returns free 30-minute start times without revealing
other patients' appointment details. Saving still rechecks availability.
An optional `idCliente` also filters slots against that patient's other
appointments. Saving locks the patient record and rejects overlapping
appointments even when they are assigned to different doctors. Legacy
appointments missing a date, time or duration conservatively block the
affected patient's availability until corrected.
New and updated appointments and availability checks accept only 30, 60 or 90
minutes. Existing records keep their duration until edited; an allowed duration
must then be selected.
New appointments can only be created on or after the current date in
Europe/Madrid. Past appointments remain viewable and editable.
`GET /citas/agenda?inicio=YYYY-MM-DD&idMedico=ID` provides a seven-day
management view with appointments, holidays and available 30-minute starts.
Doctors may request only their own agenda; administrators and receptionists
may select a clinic doctor. The patient-facing endpoint does not expose this view.

Clinical history requires migration `004-historial-clinico.sql`. Authenticated
doctors, administrators and receptionists may read patient histories; patients
may read only their own. Doctors and administrators may create notes, with an
optional appointment link checked against the patient and service. The author
comes from the authenticated session. Existing notes are retained.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
