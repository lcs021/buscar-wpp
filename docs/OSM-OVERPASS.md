# OpenStreetMap / Overpass connector (draft)

This endpoint is an authenticated, reviewer-gated search adapter. It returns a small set of candidate business records and stores the source results with an idempotency key; it does not insert leads, qualify candidates, contact businesses, create demos, or run on a schedule.

## Enablement gate

The connector returns `503` before auth or quota work unless the Edge Function has all of:

- `OVERPASS_API_URL=https://<your-controlled-host>/api/interpreter`
- `OVERPASS_API_SELF_HOSTED=true`
- the usual Supabase URL, anon key, and service-role key

The `SELF_HOSTED` value is an operator attestation, not proof. Do not point the application at the shared public Overpass instances: the OSMF/FOSSGIS usage guidance says applications depending on public instances as a backend should host their own instance. Self-hosting has compute, data-update, monitoring, and bandwidth costs even though OSM data carries no API fee. The implementation also blocks known public endpoints and requires HTTPS.

## Limits and retry behavior

- Tenant identity is the current Lead Finder row owner (`user_id`), because the schema has no organization table yet. The quota date is UTC.
- A new request reserves 10 candidate slots under a row lock. The request itself asks Overpass for at most 10 elements; successful results charge their actual count and release unused slots. This caps output at 50 candidate elements per tenant per UTC day and at five new queries/day in the worst case.
- Any source error retains the full 10-slot reservation and records a fixed error code. It never releases quota on a failed or ambiguous upstream call.
- Reusing the same idempotency UUID with the same filters returns the saved state/results without another source query. Reusing it with different filters is rejected. The returned results are deduplicated by OSM element type/ID.
- Each request has a 20-second Overpass timeout, a 4 MiB query-side `maxsize`, at most 10 result elements, and a 2 MiB response-read cap. There is one city/UF/segment query; no tiling, pagination, or repeated retries to the source.
- Supported segment keys are fixed in code. There is no client-supplied result limit or Overpass QL fragment.

## Provenance and website evidence

Each candidate stores only a business name, OSM category, requested city/UF, OSM element ID/link, source, observation time, `ODbL-1.0`, and attribution. Phone, email, postal address, and contact tags are omitted. A valid `website` tag is reported as found in OSM. A missing tag is labeled `not_located_in_sources_consulted`; an invalid website tag or empty/failed query is inconclusive. None of these labels proves that a business has no website.

Every response includes visible attribution `© OpenStreetMap contributors` and the OSM copyright/license link. ODbL attribution/share-alike implications can apply to a publicly used or shared derivative database; confirm the legal treatment before combining/exporting this data in the multi-tenant CRM. See the [OSM copyright and license notice](https://www.openstreetmap.org/copyright), [public instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), and [Overpass instance list](https://wiki.openstreetmap.org/wiki/OSM_Server_Side_Script).

## Current limitations

- This draft has no frontend control, no automatic import into `leads`, no scheduled worker, and no production endpoint configured. The new migration must be reviewed/applied separately before enabling a staged self-hosted endpoint.
- Current tenants are users, not organizations. The quota maps one user account to one organization until a first-class organization/membership model exists.
- Exact municipality boundary lookup depends on OSM administrative relations carrying the expected name and `ISO3166-2=BR-<UF>` tag. A missing/ambiguous boundary or zero results is `inconclusive`; no fallback geocoder is called.
- OSM data coverage varies. This connector is for source review, not a determination that an entity is qualified or lacks a site.
