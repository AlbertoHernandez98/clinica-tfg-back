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
Appointment, availability and holiday inputs validate identifiers as decimal
unsigned 32-bit integers, including legacy zero; malformed route parameters and
invalid request bodies are rejected with HTTP 400 before database changes.
Existing date, duration and role rules continue to apply.

Doctor-service assignment updates accept only lists of distinct unsigned
32-bit service identifiers. The doctor identifier has the same range, including
zero for legacy records. Invalid lists are rejected before assignments are
changed; only administrators and receptionists can replace assignments.

The scheduling and person endpoints require a bearer token from `POST
/auth/login` (body: `username` containing the DNI and `password`). Users must
sign in again after deployment. Set `JWT_SECRET` to a long, unpredictable
secret shared by the backend instances; without it, a random temporary key is
generated on startup and existing sessions are invalidated on restart.
Apply `migrations/007-refresh-sessions.sql`, `migrations/009-rotacion-refresh.sql`
and `migrations/010-refresh-margen.sql` before deploying this version.
Migration 009 keeps existing refresh sessions.
Access tokens last 15 minutes; the opaque, server-revocable refresh token
expires after seven days and is stored in an HttpOnly, SameSite=Strict cookie.
Only its SHA-256 hash is stored in the database. Logging out revokes the refresh
session; previously issued access tokens remain usable until they expire.
Changing a password revokes that user's refresh sessions in the same
transaction, but already issued access tokens still expire normally.
The Angular client keeps the access token only in memory and requests a new one
using the refresh cookie when the application starts. A legacy access token in
sessionStorage is removed at startup. This reduces persistence of a stolen
token but does not prevent a running XSS from accessing it or performing actions.
Refresh and logout require the exact configured `FRONTEND_ORIGIN` (defaults to
`http://localhost:4200`). In production set that origin to HTTPS and set
`NODE_ENV=production` so the cookie is marked Secure. This configuration is
for same-site deployment; a cross-site frontend requires a separate CSRF and
cookie design review. A refresh rotates the token without extending the original
expiration. For five seconds, its immediate predecessor can recover the same
successor, without another rotation, if that successor is still current.
The successor is derived by domain-separated HMAC-SHA-256 from the predecessor
and `JWT_SECRET`, so no plaintext refresh token is stored. The secret must remain
stable across restarts and instances: changing it prevents recovery of an already
rotated token. A stolen predecessor can also recover its successor during those
five seconds; this is a deliberate security/availability trade-off. Reuse after
the window or of an older predecessor revokes the family. Tokens rotated before
this update cannot be recovered with the new method. Token hashes are retained for reuse detection;
there is currently no automatic cleanup of expired session records. Concurrent
browser tabs coordinate refresh and logout using Web Locks where supported.
Browser requests without Web Locks or a lost response may still require a new
login if the retry arrives after five seconds, after another rotation, or after
a change of secret. The frontend retries once immediately after a network error,
but a delayed error or another failed attempt can still exceed the window.
Apply `migrations/006-password-hash.sql` after backing up the database and
before deploying the updated backend. New and changed passwords are hashed
using bcrypt over a SHA-256 digest; existing plaintext passwords are converted
only after a successful login. Accounts that have not logged in since this
change still contain plaintext passwords, and backups may contain them too.
HTTPS and a broader security review remain necessary before any real use.
Login rejects malformed payloads and limits failures to five per account and
per client IP in a rolling 15-minute window; in-flight attempts count until they
finish. The limiter is stored in this server process and resets on restart;
it is not shared across instances. Do not rely on it for a public or multi-node
deployment: use shared rate limiting and configure trusted proxy addresses
explicitly. Helmet supplies standard HTTP security headers.

User creation and updates validate request shape, role, document length, name
and surname length, email, and phone range before writing to the database.
Legacy document formats are accepted (this is not DNI/NIE checksum validation).
Phone numbers are stored as signed integers, so only numeric values up to
2147483647 are supported and leading zeroes cannot be preserved. Other
endpoints still require a systematic input-validation review.
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
Administrators and receptionists assign services to a doctor with
`PUT /medico_has_servicio/:id` and `{ "servicios": [1, 2] }`. The existing
`medico_has_servicio` table stores these assignments. Both appointment creation
and updates require the selected service to be assigned to the selected doctor.
Removing an assignment leaves existing appointments unchanged, but they cannot
be edited until an assigned service is selected. Review and configure existing
doctors' assignments before deployment; doctors without assignments cannot
receive new appointments.
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
Clinical history identifiers are validated as integers between 1 and
4294967295. Note bodies must be objects, with non-blank comments up to 10000
characters; edits and annulments require a non-blank reason up to 1000
characters. Invalid inputs return HTTP 400 before the mutation transaction.
Before starting this version, back up the database, review and apply
`migrations/005-historial-versiones-y-anulacion.sql` after migration 004; the
migration is not applied automatically and the new history queries require it.
Doctors may edit or annul only notes they authored; administrators may edit or
annul any note. `PATCH /historialclinico/:id` accepts `comentarios` and `motivo`;
`POST /historialclinico/:id/anular` accepts `motivo`. Each change requires a
non-empty reason and stores the previous note, actor and timestamp in the same
transaction. Annulled notes remain in the history. This functionality is not a
substitute for a full security or clinical data compliance assessment. Only
doctors and administrators can read annulled notes and previous versions;
receptionists and patients receive only current, non-annulled notes.

Apply `migrations/008-auditoria-historial.sql` before deploying this version.
Authenticated successful reads and changes, and requests denied by role or
ownership, are recorded in `auditoria_historial` with UTC time, actor, role,
operation, result and available patient or note IDs, but not clinical text.
Successful mutations and their audit records are committed in the same
transaction; an audit failure prevents the mutation. Unauthenticated requests,
invalid input and other errors are not captured by this audit. No automatic
retention or deletion is configured. Administrators can retrieve up to 100
events via `GET /historialclinico/auditoria`, and use the returned `siguiente`
as `?antes=...` for the next page. Administrators may also open the audit
viewer from the frontend header. Protect
database access and backups; this audit alone does not establish compliance.

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
