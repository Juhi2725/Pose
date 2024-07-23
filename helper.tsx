export const filterByType = (name: string, array: any) => {
  //console.log("username === ", +username, +"   -    ");

  const filteredData = array.filter((item: { name: any }) => {
    return item.name === name;
  });

  //console.log("username === ", +username, +"   -    " + filteredData);

  if (filteredData.length >= 1) {
    return filteredData;
  } else {
    return null;
  }
};
