# Knowledge Base

## Generative Adversarial Networks (GANs)

Sources: [IBM](https://www.ibm.com/think/topics/generative-adversarial-networks)

#### How do GANs work? 
A GAN architecture consists of two deep neural networks: the generator network and the discriminator network. The GAN training process involves the generator starting with random input (noise) and creating synthetic data such as images, text or sound that mimics the real data from the given training set. The discriminator evaluates both the generated samples and the data from the training set and decides whether it’s real or fake. It assigns a score between 0 (predicts fake) and 1 (predicts real). Backpropagation is then used to optimize both the networks. This means that the gradient of the loss function is calculated according to the network's parameters, and these parameters are adjusted to minimize the loss. The generator then uses feedback from the discriminator to improve, trying to create more realistic data.

![General architecture of a GAN](https://assets.ibm.com/is/image/ibm/the-structure-of-a-gan?fmt=png-alpha&dpr=on%2C1&fit=fit%2C1&wid=1584&hei=541)

The generator model tries to trick the discriminative model into classifying fake data as real, while the discriminator continuously improves its ability to distinguish between real and fake data. This process is guided by loss functions that measure each network's performance. A generator loss measures how well the generator can deceive the discriminator into believing its data is real. A low generator loss means that the generator is successfully creating realistic data. A discriminator loss measures how well the discriminator can distinguish between fake data and real data. A low discriminator loss indicates the discriminator successfully identifying fake data.  

#### Types of GANs

##### Vanilla GANs

- Basic form of GANs
- includes a generator and discriminator
- simple multilayer perceptrons for both (easy implementation)
- known for being unstable during training and require careful tuning of hyperparameters to achieve good results

##### Conditional GANs (cGAN)

- includes additional information ('labels' or 'conditions') for both the generator and discriminator to provide context to enable the generator to produce data with specific characteristics based on the input
- makes cGANs useful for tasks requiring precise control over the output
- For example, a cGAN can convert a black-and-white image to a color image by conditioning the generator to transform grayscale into the red, green, blue color model (RGB).
- widely used for generating images, text and synthetic data tailored to specific objects, topics or styles.

##### Deep Convolutional GAN (DCGAN)

- uses CNNs for generator and discriminator
- effective for generating high-quality images and other structured data

##### StyleGAN

- produces high-res images (1024x1024)
- trained by using dataset of images of the same object

##### CycleGAN

- generator and discriminator trained in a cyclic manner
- useful for style transfer and image enhancement

##### Laplacian pyramid GAN (LAPGAN)

- designed to generate high-quality images by refining them at multiple scales
- progressively adds more details at higher resolution by using a series of GANs