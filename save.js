
module.exports = async function runSave(data) {
  const {
    photo,
    description,
    latitude,
    longitude,
    classification,
    isSpam,
    isFake,
  } = data;


  console.log("Saving to DB:", {
    filename: photo.filename,
    classification,
    isSpam,
    isFake,
    description,
    latitude,
    longitude,
  });

  return true;
};
