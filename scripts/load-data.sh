kafka-console-producer --bootstrap-server localhost:9092 \
  --topic $1 --property "parse.key=true" --property "key.separator=," < data.txt