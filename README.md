# MobileCaddy Ionic v7/8 Starter App

A demo project showing the use of MobileCaddy with an Ionic v7 project.

### Build / Environment Details
- Node v20
- Ionic CLI v7.2.0
- Ionic v8.0.0
- Angular v18.0.0


## Misc Notes / Thoughts
- Supporting CodeFlow files (e.g. `MockCordova`) currently reside in the `src/assets/js` dir, and are not brought in by the CodeFlow scripts but are in this repo - These will be removed and replaced with scripts pulled from the CodeFlow dep

## Development Notes
- The app is very basic. This is deliberate, and hopes to create to demonstrate some approaches to functionality.
- It's made up of a loading/welcome process where the user can swipe through images before getting into the app for the 1st time.
- If the users swipes through all screen before the app is ready then they can be shown a holding image. We have had good feedback from showing a blurred image of an app.
- The user is shown a loading spinner which gives a rough idea of how far the app is through it's build and initial sync process
- The `app.compoenent.ts` contains an import and declaration of the MobileCaddy `devUtils`. This allows for access to calls such as `readRecords()` from the browser developer tools console.
- There are `startup` and `sync` services defined to handle the initial startup and sync flows. These provide subscriptions for some of the MobileCaddy API calls. You don't have to use these, they are just there as an example.
- Some config is held in the `app.config.ts`. This can be used for the following;
  - Defining indexSpecs for the tables. By default all fields have an index on them (a limitation of the smartstore, at present). Here you can define just those fields that you do want to be indexed. Note that any fields to be used in `WHERE` soql clauses will need to be included.
  - Sync Points - You can define named sync points as well as those for coldStart etc. These are currently used by the example `sync` service.
  - Upgrade options
- There are some analytics being recorded, so as to see what parts of the app are being used. 


## Running

The app has a file called `mc-params.json` that informs the CLI whether to to perform a _scrub_ and if to run against local mock data or against an actual Salesforce backend.

**Before** the first run up you must run an initial `ionic build` command to get all the assets into the right place.
```
ionic build
```

Once done you can start the app with the MobileCaddy CLI command as follows. By default the app runs up against local mock data
```
mobilecaddy serve
```

## Testing

Jasmine unit tests can be run with 
```
npm run test
```

## Build & Deploy Steps

There is a `mc-templates/index.html` which is the file that is used in the bundled app that is used when running on a client. This file needs updating if you alter the `DEVICE_APP_NAME` or `clientBundleVersion` values (which you probably will). The plan is to add steps to the deploy process to update these inline with the `src/index.html` file, but this is not yet in place.

### MobileCaddy CLI Command
```
mobilecaddy deploy -u <username> -e <endpoint> -p -c 3
```

### Manual-ish commands
```
ionic build && \
rm -r mc-build/appbundle/* && \
cp -r www/* mc-build/appbundle && \
rm -r mc-build/appbundle/assets/mock* && \
rm mc-build/appbundle.zip && \
cd  mc-build && \
mv appbundle/styles.*.css appbundle/styles.css  && \
mv appbundle/runtime.*.js appbundle/runtime.js  && \
mv appbundle/polyfills.*.js appbundle/polyfills.js  && \
mv appbundle/main.*.js appbundle/main.js  && \
cp ../mc-templates/index.html appbundle/index.html && \
zip -r appbundle.zip appbundle && \
cd ..
```

## DevTools Info

### Console Filters
```
-MockCordova -devUtils -smartStore -mockvfremote -Passing
```

### Accessing services from the console
- Install the Angular DevTools Chrome extension 
- The `app.compoenent.ts` contains an import and declaration of the MobileCaddy `devUtils`. This allows for access to calls such as `readRecords()` from the browser developer tools console.
- With the app running select the _Angular_ tab in the dev tools, and then the very top-most `app-root` element in the tree. Doing so will assign the variable `$ng0` to the app-root.
- You can now access service etc as follows;

```
# Read

$ng0.devUtils.readRecords('MC_Project__ap').then(r => console.log(r));


# Update

$ng0.devUtils.updateRecord('MC_Project__ap', {"Id": "a0MPw000000wSAPMA2", "Name": "Test01"}, "Id").then(r => console.log(r));


# Sync

$ng0.devUtils.syncMobileTable('MC_Project__ap').then(r => console.log(r)).catch(e => console.warn(e));
```