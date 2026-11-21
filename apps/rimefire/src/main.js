import { boot } from '@ryqndev/rimefire';

boot(document.getElementById('c'), {
    dev: import.meta.env.DEV && location.search.indexOf('dev') >= 0,
});
