// Preserve previously shared property links after moving the agent website.
if (location.hash.startsWith('#property/')) {
  location.replace('/vtmultifamily/michellehebert' + location.search + location.hash);
}
