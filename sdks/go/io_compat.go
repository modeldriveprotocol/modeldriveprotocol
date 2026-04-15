package mdp

import "io"

func ioReadAll(reader io.Reader) ([]byte, error) {
	return io.ReadAll(reader)
}
